import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { startEventRefillCheckout, startVenueRefillCheckout } from '@/api/beverages';
import { type BuyerDetails, PaymentStep } from '@/components/checkout/payment-step';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  checkoutEmail,
  formatPhoneForPayment,
  localEthiopianDigits,
  methodsFor,
  phoneProblem,
} from '@/lib/payment-methods';
import { formatPrice } from '@/lib/pricing';
import { useEventRefillQuote, useVenueRefillQuote } from '@/queries/beverages';
import { usePaymentConfig } from '@/queries/payments';
import { useAuthStore } from '@/stores/use-auth-store';
import type { Currency, PaymentMethodId } from '@/types/api';

/**
 * The payment leg of the refill flow — one step, unlike the cinema/event
 * sheets' basket-then-payment slide, because the basket is already built on
 * the catalog screen behind this. Same channel split as `api/beverages.ts`:
 * an event basket checks out against the event, a venue one against the venue.
 */

/** One basket line as the catalog screen already knows it — enough to both display and price. */
export type RefillCartLine = {
  id: string;
  name: string;
  color?: string | null;
  unitPrice: number;
  quantity: number;
};

export type RefillCheckoutSheetProps = {
  visible: boolean;
  onClose: () => void;
  channel: 'event' | 'venue';
  ownerId: string;
  lines: RefillCartLine[];
  /** The catalog's own prices, shown until the server quote lands. */
  clientTotal: number;
  currency: Currency;
  summary: string;
};

export function RefillCheckoutSheet({
  visible,
  onClose,
  channel,
  ownerId,
  lines,
  clientTotal,
  currency,
  summary,
}: RefillCheckoutSheetProps) {
  const theme = useTheme();
  const router = useRouter();
  const { config } = usePaymentConfig();
  const user = useAuthStore((s) => s.user);

  const provider = config.activeProvider === 'CHAPA' ? 'CHAPA' : 'SANTIM';
  const methods = useMemo(() => methodsFor(currency, config.activeProvider), [currency, config.activeProvider]);

  const items = useMemo(() => lines.map(({ id, quantity }) => ({ id, quantity })), [lines]);

  const eventQuote = useEventRefillQuote(channel === 'event' ? ownerId : undefined, visible ? items : null);
  const venueQuote = useVenueRefillQuote(channel === 'venue' ? ownerId : undefined, visible ? items : null);
  const { quote } = channel === 'event' ? eventQuote : venueQuote;
  const total = quote?.total ?? clientTotal;

  const [picked, setPicked] = useState<PaymentMethodId | null>(null);
  const [edits, setEdits] = useState<Partial<BuyerDetails>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const method = picked && methods.some((m) => m.id === picked) ? picked : null;

  const accountName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const knownAs = accountName || null;
  const details: BuyerDetails = useMemo(
    () => ({
      fullName: edits.fullName ?? accountName,
      phone: edits.phone ?? localEthiopianDigits(user?.phoneNumber ?? ''),
      email: edits.email ?? (user?.email?.includes('customerpazimo') ? '' : (user?.email ?? '')),
    }),
    [edits, accountName, user],
  );

  const reset = useCallback(() => {
    setPicked(null);
    setEdits({});
    setShowErrors(false);
    setSubmitting(false);
    setError(null);
  }, []);

  const close = useCallback(() => {
    Keyboard.dismiss();
    onClose();
    setTimeout(reset, 260);
  }, [onClose, reset]);

  const onPay = useCallback(async () => {
    if (!method) return;

    setShowErrors(true);
    const chosen = methods.find((m) => m.id === method) ?? null;
    const nameMissing = !knownAs && details.fullName.trim().length < 2;
    if (nameMissing || phoneProblem(details.phone, currency, chosen) !== null) return;

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);

    try {
      const body = {
        items,
        phoneNumber: formatPhoneForPayment(details.phone, currency, provider),
        customerName: (knownAs || details.fullName).trim() || 'Pazimo Customer',
        customerEmail: checkoutEmail(details.email, user?.email),
        method,
      };
      const response =
        channel === 'event'
          ? await startEventRefillCheckout(ownerId, body)
          : await startVenueRefillCheckout(ownerId, body);

      onClose();
      setTimeout(reset, 260);
      // Navigate before opening any browser, so the order watcher — which is
      // what actually settles the order — is already running underneath the
      // card checkout, the same reasoning cinema's `onPay` follows.
      router.push(`/refill/order/${response.transactionId}`);

      if (response.checkoutUrl) {
        await WebBrowser.openBrowserAsync(response.checkoutUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          toolbarColor: '#08080A',
          controlsColor: '#FFFFFF',
        });
      }
    } catch (err) {
      setSubmitting(false);
      const message = err instanceof ApiError ? err.message : 'We could not start that payment. Try again.';
      setError(message);
    }
  }, [method, methods, knownAs, details, currency, provider, items, channel, ownerId, user, onClose, reset, router]);

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.header}>
        <Text variant="title" style={styles.headerTitle}>
          Your order
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

      <View style={styles.lines}>
        {lines.map((line) => (
          <View key={line.id} style={styles.line}>
            <View style={[styles.dot, { backgroundColor: line.color || theme.textMuted }]} />
            <Text variant="small" numberOfLines={1} style={styles.lineName}>
              {line.name} × {line.quantity}
            </Text>
            <Text variant="small" color="textSecondary">
              {formatPrice(line.unitPrice * line.quantity, currency)}
            </Text>
          </View>
        ))}
      </View>

      <PaymentStep
        methods={methods}
        selectedMethod={method}
        onSelectMethod={setPicked}
        details={details}
        onChangeDetails={setEdits}
        knownAs={knownAs}
        currency={currency}
        total={total}
        summary={summary}
        showErrors={showErrors}
        submitting={submitting}
        error={error}
        onPay={onPay}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerTitle: { flex: 1 },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lines: { gap: Spacing.sm, marginBottom: Spacing.lg },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: Radius.pill },
  lineName: { flex: 1 },
});
