import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { fetchWalletDeposit, startWalletDeposit } from '@/api/wallet';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { localEthiopianDigits } from '@/lib/payment-methods';
import { formatPrice } from '@/lib/pricing';
import { DEPOSIT_METHODS } from '@/lib/wallet';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';
import type { WalletDeposit, WalletDepositMethod, WalletSummary } from '@/types/api';

/**
 * Add money through Chapa. Mobile money pushes a prompt to the phone, so the
 * sheet stays open and polls; a card opens Chapa's page and the sheet polls
 * underneath it. The balance only changes once the server has heard "paid"
 * from Chapa itself, so this sheet never shows success on its own say-so.
 */

const QUICK_AMOUNTS = [100, 500, 1000, 2000];
const POLL_MS = 3000;
const GIVE_UP_MS = 5 * 60 * 1000;

type Phase = { kind: 'form' } | { kind: 'waiting'; deposit: WalletDeposit } | { kind: 'done'; deposit: WalletDeposit };

export function DepositSheet({
  visible,
  onClose,
  wallet,
}: {
  visible: boolean;
  onClose: () => void;
  wallet: WalletSummary;
}) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const methods = wallet.depositMethods;
  const [amount, setAmount] = useState('');
  const [picked, setPicked] = useState<WalletDepositMethod | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(0);

  const method = picked && methods.includes(picked) ? picked : (methods[0] ?? null);
  const look = method ? DEPOSIT_METHODS[method] : null;
  const phoneValue = phone ?? localEthiopianDigits(user?.phoneNumber ?? '');
  const value = Number(amount);
  const room = Math.max(0, wallet.limits.maxBalance - (wallet.balance ?? 0));

  const amountError = !amount
    ? null
    : !Number.isFinite(value) || value <= 0
      ? 'Enter an amount.'
      : value < wallet.limits.minDeposit
        ? `The smallest deposit is ${formatPrice(wallet.limits.minDeposit, 'ETB')}.`
        : value > wallet.limits.maxDeposit
          ? `The largest deposit is ${formatPrice(wallet.limits.maxDeposit, 'ETB')}.`
          : value > room
            ? `Your wallet can hold ${formatPrice(room, 'ETB')} more.`
            : null;

  const localPhone = localEthiopianDigits(phoneValue);
  const phoneError = look?.card
    ? null
    : localPhone.length !== 9 || !/^[79]/.test(localPhone)
      ? 'Enter a 9-digit Ethiopian number.'
      : look?.requiresPrefix && `0${localPhone[0]}` !== look.requiresPrefix
        ? `${look.name} only works with ${look.requiresPrefix}… numbers.`
        : null;

  const reset = useCallback(() => {
    setAmount('');
    setPicked(null);
    setPhone(null);
    setPhase({ kind: 'form' });
    setBusy(false);
    setError(null);
  }, []);

  const close = useCallback(() => {
    Keyboard.dismiss();
    onClose();
    queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
    setTimeout(reset, 260);
  }, [onClose, queryClient, reset]);

  // Poll while a deposit waits for Chapa.
  const waitingRef = phase.kind === 'waiting' ? phase.deposit.txRef : null;
  useEffect(() => {
    if (!waitingRef || !visible) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const next = await fetchWalletDeposit(waitingRef);
        if (cancelled) return;
        if (next.status !== 'PENDING') {
          setPhase({ kind: 'done', deposit: next });
          queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
        } else if (Date.now() - startedAt.current > GIVE_UP_MS) {
          setPhase({ kind: 'done', deposit: next });
        }
      } catch {
        // A dropped poll is retried on the next tick.
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [waitingRef, visible, queryClient]);

  const submit = async () => {
    if (!method || amountError || !amount || phoneError) {
      setError(amountError || phoneError || 'Enter an amount.');
      return;
    }
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    try {
      const deposit = await startWalletDeposit({
        amount: value,
        method,
        phoneNumber: look?.card ? undefined : `0${localPhone}`,
      });
      startedAt.current = Date.now();
      setPhase({ kind: 'waiting', deposit });
      if (deposit.checkoutUrl) {
        await WebBrowser.openBrowserAsync(deposit.checkoutUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          toolbarColor: '#08080A',
          controlsColor: '#FFFFFF',
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We couldn’t start that payment. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.header}>
        <Text variant="title" style={styles.flex}>
          Add money
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

      {phase.kind === 'form' ? (
        <View style={styles.body}>
          <Field
            label="Amount (ETB)"
            value={amount}
            onChangeText={(text) => {
              setAmount(text.replace(/[^0-9.]/g, ''));
              setError(null);
            }}
            placeholder="500"
            keyboardType="decimal-pad"
            error={amountError}
            hint={`${formatPrice(wallet.limits.minDeposit, 'ETB')} – ${formatPrice(Math.min(wallet.limits.maxDeposit, room), 'ETB')}`}
          />
          <View style={styles.chips}>
            {QUICK_AMOUNTS.filter((q) => q <= Math.min(wallet.limits.maxDeposit, room)).map((q) => (
              <Touchable
                key={q}
                accessibilityRole="button"
                accessibilityLabel={`${q} birr`}
                onPress={() => setAmount(String(q))}
                pressedScale={0.95}
                style={[
                  styles.chip,
                  {
                    borderColor: amount === String(q) ? 'rgba(255,255,255,0.85)' : theme.glassBorder,
                    backgroundColor: amount === String(q) ? theme.brandTint : 'rgba(255,255,255,0.05)',
                  },
                ]}>
                <Text variant="small">{q.toLocaleString()}</Text>
              </Touchable>
            ))}
          </View>

          <View style={styles.section}>
            <Text variant="caption" color="textSecondary">
              Pay with
            </Text>
            <View style={styles.methods}>
              {methods.map((id) => {
                const item = DEPOSIT_METHODS[id];
                const active = id === method;
                return (
                  <Touchable
                    key={id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={item.name}
                    onPress={() => setPicked(id)}
                    haptic
                    pressedScale={0.95}
                    style={[
                      styles.method,
                      {
                        backgroundColor: active ? theme.brandTint : 'rgba(255,255,255,0.05)',
                        borderColor: active ? 'rgba(255,255,255,0.85)' : theme.glassBorder,
                        borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                      },
                    ]}>
                    <View style={styles.logoPlate}>
                      {item.logo ? (
                        <Image source={item.logo} style={styles.logo} contentFit="contain" />
                      ) : (
                        <Ionicons name="business" size={18} color="#111" />
                      )}
                    </View>
                    <Text variant="caption" numberOfLines={1}>
                      {item.name}
                    </Text>
                  </Touchable>
                );
              })}
            </View>
          </View>

          {look && !look.card ? (
            <Field
              label="Phone to pay from"
              value={phoneValue}
              onChangeText={setPhone}
              prefix="+251"
              placeholder="912 345 678"
              keyboardType="phone-pad"
              error={amount ? phoneError : null}
              hint="The payment prompt goes to this number."
            />
          ) : null}

          {error && !amountError ? (
            <Text variant="small" color="danger" style={styles.center}>
              {error}
            </Text>
          ) : null}

          <Button
            label={value > 0 ? `Add ${formatPrice(value, 'ETB')}` : 'Add money'}
            size="lg"
            loading={busy}
            disabled={!method || !amount || Boolean(amountError) || Boolean(phoneError)}
            onPress={submit}
          />
          <Text variant="caption" color="textMuted" style={styles.center}>
            Wallet money can only be spent on Pazimo. It can’t be withdrawn.
          </Text>
        </View>
      ) : phase.kind === 'waiting' ? (
        <View style={[styles.body, styles.centerBlock]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text variant="heading" style={styles.center}>
            {formatPrice(phase.deposit.amount, 'ETB')}
          </Text>
          <Text variant="body" color="textSecondary" style={styles.center}>
            {phase.deposit.checkoutUrl
              ? 'Finish paying on the Chapa page. Your balance updates as soon as Chapa confirms.'
              : 'Approve the payment prompt on your phone. Your balance updates as soon as Chapa confirms.'}
          </Text>
          <Button label="Close — I’ll check later" variant="ghost" onPress={close} />
        </View>
      ) : (
        <View style={[styles.body, styles.centerBlock]}>
          <Ionicons
            name={phase.deposit.status === 'PAID' ? 'checkmark-circle' : phase.deposit.status === 'PENDING' ? 'time' : 'close-circle'}
            size={56}
            color={phase.deposit.status === 'PAID' ? theme.success : phase.deposit.status === 'PENDING' ? theme.text : theme.danger}
          />
          <Text variant="heading" style={styles.center}>
            {phase.deposit.status === 'PAID'
              ? `${formatPrice(phase.deposit.amount, 'ETB')} added`
              : phase.deposit.status === 'PENDING'
                ? 'Still waiting for Chapa'
                : 'Payment didn’t go through'}
          </Text>
          <Text variant="body" color="textSecondary" style={styles.center}>
            {phase.deposit.status === 'PAID'
              ? phase.deposit.balance != null
                ? `Your balance is ${formatPrice(phase.deposit.balance, 'ETB')}.`
                : 'It’s in your wallet.'
              : phase.deposit.status === 'PENDING'
                ? 'If you approved it, it will show up in your wallet shortly — we keep checking.'
                : phase.deposit.failureReason || 'No money was added. You can try again.'}
          </Text>
          <Button label="Done" size="lg" onPress={close} style={styles.stretch} />
        </View>
      )}
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
  section: { gap: Spacing.sm },
  center: { textAlign: 'center' },
  centerBlock: { alignItems: 'center', paddingVertical: Spacing.lg },
  stretch: { alignSelf: 'stretch' },
  chips: { flexDirection: 'row', gap: Spacing.sm, marginTop: -Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  methods: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  method: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  logoPlate: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  logo: { width: '100%', height: '100%' },
  bold: { fontFamily: FontFamily.bold },
});
