import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import { generateIdempotencyKey } from '@/lib/idempotency';
import { getInstallationId } from '@/lib/installation';
import { formatPrice } from '@/lib/pricing';
import { queryKeys } from '@/queries/keys';
import { useMyWallet } from '@/queries/wallet';
import type { Currency, WalletPayFields, WalletPayResult } from '@/types/api';

/**
 * "Pay with Pazimo Wallet" for any checkout sheet.
 *
 * The sheets keep their own flow — pick a basket, pick how to pay, tap Pay —
 * and this adds the wallet as one more way to pay: whether to offer it (and
 * why it can't be used right now), the PIN typed inline on the payment step,
 * and what to do with the server's wallet-specific answers.
 *
 * One idempotency key per attempt: a retry after a dropped connection or a
 * wrong PIN reuses it, so the server can never charge the same order twice.
 * It is renewed only once an attempt has a final answer.
 */

/** What the payment step needs to draw the wallet option. */
export type WalletOption = {
  balance: number;
  /** Null when the wallet can pay; otherwise why not, shown under the option. */
  blocker: string | null;
  /** Tapping a blocked option takes the buyer where they can fix it. */
  actionLabel: string | null;
  selected: boolean;
  onSelect: () => void;
  pin: string;
  onChangePin: (pin: string) => void;
  pinError: string | null;
};

/** Wallet codes that are about the PIN itself, so the pad clears for another try. */
const PIN_CODES = new Set(['WALLET_PIN_INCORRECT', 'WALLET_PIN_REQUIRED', 'WALLET_PIN_LOCKED']);

export function useWalletCheckout({ total, currency }: { total: number; currency: Currency }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: wallet } = useMyWallet();

  const [selected, setSelected] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [attemptKey, setAttemptKey] = useState(generateIdempotencyKey);

  const offered = Boolean(wallet?.enabled && currency === 'ETB');
  const balance = wallet?.balance ?? 0;

  let blocker: string | null = null;
  let actionLabel: string | null = null;
  // The server only sends cool-off and lock times while they are still in the
  // future, so their presence alone means "not yet" — no clock needed here.
  if (offered && wallet) {
    if (!wallet.exists) {
      blocker = 'Set up your wallet to pay with it.';
      actionLabel = 'Set up';
    } else if (wallet.status === 'frozen') {
      blocker = 'Your wallet is frozen.';
      actionLabel = 'Open wallet';
    } else if (!wallet.device?.verified) {
      blocker = 'Verify this phone to use your wallet here.';
      actionLabel = 'Verify';
    } else if (!wallet.pinSet) {
      blocker = 'Set a new wallet PIN first.';
      actionLabel = 'Set PIN';
    } else if (wallet.device.spendAllowedAfter) {
      blocker = 'This phone was added recently and can pay with the wallet soon.';
    } else if (wallet.spendBlockedUntil) {
      blocker = 'Wallet payments resume soon after your PIN reset.';
    } else if (balance < total) {
      blocker = `Not enough in your wallet (${formatPrice(balance, 'ETB')}).`;
      actionLabel = 'Add money';
    }
  }

  const deselect = useCallback(() => {
    setSelected(false);
    setPin('');
    setPinError(null);
  }, []);

  const select = useCallback(() => {
    if (blocker) {
      if (actionLabel) router.push('/wallet');
      return;
    }
    setSelected(true);
    setPinError(null);
  }, [actionLabel, blocker, router]);

  const option: WalletOption | null = offered
    ? {
        balance,
        blocker,
        actionLabel,
        selected: selected && !blocker,
        onSelect: select,
        pin,
        onChangePin: (next) => {
          setPin(next);
          setPinError(null);
        },
        pinError,
      }
    : null;

  /**
   * Runs one wallet payment. `charge` sends the checkout's own body plus the
   * wallet fields; resolves with the result when the order was paid, or
   * null when the error has been shown on the PIN pad (try again there).
   * Anything else is thrown for the sheet's usual error line.
   */
  const pay = useCallback(
    async (charge: (fields: WalletPayFields) => Promise<WalletPayResult>) => {
      setPinError(null);
      const fields: WalletPayFields = {
        method: 'wallet',
        walletPin: pin,
        installationId: await getInstallationId(),
        idempotencyKey: attemptKey,
      };
      try {
        const result = await charge(fields);
        setAttemptKey(generateIdempotencyKey());
        setPin('');
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
        if (result.action !== 'paid') {
          throw new ApiError(
            result.refunded
              ? "This order couldn't be completed. Your money is back in your wallet."
              : "This order couldn't be completed.",
            409,
            'WALLET_ORDER_FAILED',
          );
        }
        return result;
      } catch (error) {
        if (error instanceof ApiError && error.code?.startsWith('WALLET_') && error.code !== 'WALLET_ORDER_FAILED') {
          if (PIN_CODES.has(error.code)) setPin('');
          setPinError(error.message);
          // A wrong PIN created nothing, so the same key is still right for the
          // next try; anything else about the wallet itself (balance, limit,
          // freeze) gets a fresh one along with a fresh look at the wallet.
          if (!PIN_CODES.has(error.code)) {
            setAttemptKey(generateIdempotencyKey());
            queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
          }
          return null;
        }
        throw error;
      }
    },
    [attemptKey, pin, queryClient],
  );

  return { option, selected: selected && !blocker, deselect, pay, pinReady: pin.length === 6 };
}
