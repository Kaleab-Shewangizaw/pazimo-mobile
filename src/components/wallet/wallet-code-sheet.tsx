import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import {
  type WalletCodePurpose,
  completeWalletSetup,
  resetWalletPin,
  sendWalletCode,
  unfreezeWallet,
  verifyWalletDevice,
} from '@/api/wallet';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { weakPinReason } from '@/lib/wallet';
import { queryKeys } from '@/queries/keys';

/**
 * Every wallet flow that starts with an SMS code to the account's phone:
 * creating the wallet, resetting a forgotten PIN, using the wallet on a new
 * phone, and lifting a freeze the customer made themselves.
 *
 * Setup and PIN reset then ask for a new PIN twice. The code is checked by the
 * server only when the whole flow is submitted, so a wrong code sends the
 * customer back to the code step with the PIN they chose still in hand.
 */

type Step = 'intro' | 'code' | 'pin' | 'confirm';

const COPY: Record<WalletCodePurpose, { title: string; intro: string; button: string }> = {
  setup: {
    title: 'Create your wallet',
    intro:
      'Add money once with Telebirr, CBE Birr or M-Pesa, then pay for tickets, cinema and drinks with just your PIN. Wallet money can only be spent on Pazimo — it can’t be withdrawn or sent to others.',
    button: 'Send me a code',
  },
  reset_pin: {
    title: 'Reset your PIN',
    intro: 'We’ll text a code to the phone number on your account. For your safety, wallet payments pause for a while after a reset.',
    button: 'Send me a code',
  },
  new_device: {
    title: 'Verify this phone',
    intro: 'Your wallet only works on phones you’ve verified. We’ll text a code to the number on your account. New phones can pay after a short waiting period.',
    button: 'Send me a code',
  },
  unfreeze: {
    title: 'Unfreeze your wallet',
    intro: 'We’ll text a code to the number on your account to confirm it’s you.',
    button: 'Send me a code',
  },
};

const needsPin = (purpose: WalletCodePurpose) => purpose === 'setup' || purpose === 'reset_pin';

/** The server's resend cooldown (backend walletService OTP_RESEND_COOLDOWN_MS). */
const RESEND_COOLDOWN_MS = 60 * 1000;

/**
 * Codes already texted, per flow. Kept outside the sheet so closing it by
 * accident — a tap on the backdrop — doesn't strand a code the server is
 * still waiting for: reopening goes straight back to entering it.
 */
type SentCode = { maskedPhone: string | null; sentAt: number; expiresAt: number };
const sentCodes: Partial<Record<WalletCodePurpose, SentCode>> = {};

function liveCode(purpose: WalletCodePurpose): SentCode | null {
  const sent = sentCodes[purpose];
  if (!sent) return null;
  if (sent.expiresAt <= Date.now()) {
    delete sentCodes[purpose];
    return null;
  }
  return sent;
}

function resendCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function WalletCodeSheet({
  visible,
  purpose,
  onClose,
}: {
  visible: boolean;
  purpose: WalletCodePurpose;
  onClose: () => void;
}) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const copy = COPY[purpose];

  const [step, setStep] = useState<Step>(() => (liveCode(purpose) ? 'code' : 'intro'));
  const [maskedPhone, setMaskedPhone] = useState<string | null>(() => liveCode(purpose)?.maskedPhone ?? null);
  const [resendIn, setResendIn] = useState(0);
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ticks the "Send a new code in 0:42" label while the server would refuse a resend.
  useEffect(() => {
    if (step !== 'code') return;
    const tick = () => {
      const sent = sentCodes[purpose];
      setResendIn(sent ? Math.max(0, Math.ceil((sent.sentAt + RESEND_COOLDOWN_MS - Date.now()) / 1000)) : 0);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [step, purpose]);

  const reset = useCallback(() => {
    setStep(liveCode(purpose) ? 'code' : 'intro');
    setCode('');
    setPin('');
    setConfirm('');
    setError(null);
    setBusy(false);
  }, [purpose]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    onClose();
    setTimeout(reset, 260);
  }, [onClose, reset]);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const sent = await sendWalletCode(purpose);
      const now = Date.now();
      sentCodes[purpose] = { maskedPhone: sent.maskedPhone, sentAt: now, expiresAt: now + sent.expiresInSeconds * 1000 };
      setMaskedPhone(sent.maskedPhone);
      setCode('');
      setStep('code');
    } catch (err) {
      const apiError = err instanceof ApiError ? err : null;
      if (apiError?.code === 'WALLET_OTP_COOLDOWN' && step === 'intro') {
        // A code went out moments ago (before an app restart, say) — let them type it.
        const now = Date.now();
        sentCodes[purpose] ??= { maskedPhone: null, sentAt: now, expiresAt: now + RESEND_COOLDOWN_MS * 10 };
        setStep('code');
        return;
      }
      setError(apiError?.message ?? 'We couldn’t send a code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const finish = async (finalCode: string, finalPin: string) => {
    setBusy(true);
    setError(null);
    try {
      if (purpose === 'setup') await completeWalletSetup(finalCode, finalPin);
      else if (purpose === 'reset_pin') await resetWalletPin(finalCode, finalPin);
      else if (purpose === 'new_device') await verifyWalletDevice(finalCode);
      else await unfreezeWallet(finalCode);
      delete sentCodes[purpose];
      await queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
      close();
    } catch (err) {
      setBusy(false);
      const apiError = err instanceof ApiError ? err : null;
      setError(apiError?.message ?? 'Something went wrong. Try again.');
      // Back to wherever the problem is.
      if (apiError?.code === 'WALLET_PIN_WEAK' || apiError?.code === 'WALLET_PIN_FORMAT') {
        setPin('');
        setConfirm('');
        setStep('pin');
      } else if (apiError?.code?.startsWith('WALLET_OTP')) {
        // An expired code is gone server-side; after any other code error "Send a new code" is still there.
        if (apiError.code === 'WALLET_OTP_EXPIRED') {
          delete sentCodes[purpose];
          setResendIn(0);
        }
        setCode('');
        setStep('code');
      }
    }
  };

  const onCode = (next: string) => {
    setCode(next);
    setError(null);
    if (next.length === 6) {
      if (needsPin(purpose)) {
        // Keep a PIN already chosen if the customer is only retyping the code.
        setStep(pin.length === 6 && confirm === pin ? 'confirm' : 'pin');
      } else {
        finish(next, '');
      }
    }
  };

  const onPin = (next: string) => {
    setPin(next);
    setError(null);
    if (next.length === 6) {
      const weak = weakPinReason(next);
      if (weak) {
        setError(weak);
        setPin('');
        return;
      }
      setConfirm('');
      setStep('confirm');
    }
  };

  const onConfirm = (next: string) => {
    setConfirm(next);
    setError(null);
    if (next.length === 6) {
      if (next !== pin) {
        setError('The PINs don’t match. Choose your PIN again.');
        setPin('');
        setConfirm('');
        setStep('pin');
        return;
      }
      finish(code, next);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.header}>
        <Text variant="title" style={styles.flex}>
          {copy.title}
        </Text>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={close}
          pressedScale={0.9}
          style={[styles.headerButton, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons name="close" size={18} color={theme.text} />
        </Touchable>
      </View>

      <View style={styles.body}>
        {step === 'intro' ? (
          <>
            <Text variant="body" color="textSecondary">
              {copy.intro}
            </Text>
            <Button label={copy.button} size="lg" loading={busy} onPress={send} />
          </>
        ) : step === 'code' ? (
          <>
            <Text variant="body" color="textSecondary">
              Enter the 6-digit code we sent{maskedPhone ? ` to ${maskedPhone}` : ''}.
            </Text>
            <OtpInput value={code} onChangeText={onCode} autoFocus accessibilityLabel="SMS code, 6 digits" />
            <Button
              label={resendIn > 0 ? `Send a new code in ${resendCountdown(resendIn)}` : 'Send a new code'}
              variant="ghost"
              disabled={busy || resendIn > 0}
              onPress={send}
            />
          </>
        ) : step === 'pin' ? (
          <>
            <Text variant="body" color="textSecondary">
              Choose a 6-digit wallet PIN. You’ll enter it every time you pay. Don’t use your phone’s
              unlock code or your birthday.
            </Text>
            <OtpInput value={pin} onChangeText={onPin} secure autoFocus accessibilityLabel="New wallet PIN, 6 digits" />
          </>
        ) : (
          <>
            <Text variant="body" color="textSecondary">
              Enter the same PIN again.
            </Text>
            <OtpInput
              value={confirm}
              onChangeText={onConfirm}
              secure
              autoFocus
              accessibilityLabel="Confirm wallet PIN, 6 digits"
            />
          </>
        )}

        {error ? (
          <Text variant="small" color="danger" accessibilityLiveRegion="polite" style={styles.center}>
            {error}
          </Text>
        ) : null}
        {busy && step !== 'intro' ? (
          <Text variant="small" color="textSecondary" style={styles.center}>
            Checking…
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  body: { gap: Spacing.lg },
  center: { textAlign: 'center' },
});
