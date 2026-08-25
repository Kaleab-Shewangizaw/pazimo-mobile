import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Keyboard, type LayoutChangeEvent, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ApiError } from '@/api/client';
import { startCinemaCheckout } from '@/api/cinema-checkout';
import { type BuyerDetails, PaymentStep } from '@/components/checkout/payment-step';
import { SnacksStep } from '@/components/cinema/snacks-step';
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
import { useCinemaConcessions, useCinemaQuote } from '@/queries/cinema-checkout';
import { usePaymentConfig } from '@/queries/payments';
import { useAuthStore } from '@/stores/use-auth-store';
import { useCinemaBookingStore, type SelectedConcession } from '@/stores/use-cinema-booking-store';
import type { CinemaCheckoutBasket, CinemaConcessionItem, PaymentMethodId } from '@/types/api';

/**
 * Snacks, then payment — one sheet, the same shape as the event flow's
 * `CheckoutSheet`. Seat selection stays a full screen behind this (a seat map
 * needs the room), but once seats are picked, choosing snacks and paying for
 * them are two views of the same remaining decision, so they slide past each
 * other here rather than becoming their own routes.
 */

const SLIDE = { duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1) } as const;
const TRAVEL = 0.28;

export type CinemaCheckoutSheetProps = {
  visible: boolean;
  onClose: () => void;
  showtimeId: string;
  /** The payment step found a seat already taken — the caller should reopen the seat map. */
  onSeatConflict: () => void;
};

export function CinemaCheckoutSheet({
  visible,
  onClose,
  showtimeId,
  onSeatConflict,
}: CinemaCheckoutSheetProps) {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const store = useCinemaBookingStore();
  const { concessions, isLoading: concessionsLoading } = useCinemaConcessions(store.cinemaId ?? undefined);
  const { config } = usePaymentConfig();
  const user = useAuthStore((s) => s.user);

  const provider = config.activeProvider === 'CHAPA' ? 'CHAPA' : 'SANTIM';
  const methods = useMemo(() => methodsFor('ETB', config.activeProvider), [config.activeProvider]);

  const [step, setStep] = useState<0 | 1>(0);
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

  const basket: CinemaCheckoutBasket | null = useMemo(
    () =>
      store.showtimeId === showtimeId
        ? {
            showtime: showtimeId,
            ...(store.assignedSeating === false
              ? { ticketType: store.ticketTypeId ?? undefined, quantity: store.quantity }
              : { seats: store.seats.map((s) => s.seatKey) }),
            concessions: store.concessions.map((c) => ({
              cinemaBeverage: c.cinemaBeverage,
              quantity: c.quantity,
            })),
          }
        : null,
    [store.showtimeId, showtimeId, store.assignedSeating, store.ticketTypeId, store.quantity, store.seats, store.concessions],
  );
  const { quote, loading: quoting } = useCinemaQuote(visible ? basket : null);

  const summary =
    store.assignedSeating === false
      ? `${store.quantity} × General admission`
      : `${store.seats.length} seat${store.seats.length === 1 ? '' : 's'}`;

  const onChangeQuantity = useCallback(
    (item: CinemaConcessionItem, quantity: number) => {
      const rest = store.concessions.filter((c) => c.cinemaBeverage !== item._id);
      const next: SelectedConcession[] =
        quantity > 0
          ? [
              ...rest,
              {
                cinemaBeverage: item._id,
                name: item.beverage.name,
                image: item.beverage.image,
                unitPrice: item.price,
                quantity,
              },
            ]
          : rest;
      store.setConcessions(next);
    },
    [store],
  );

  const [slide] = useState(() => new Animated.Value(0));
  const [grow] = useState(() => new Animated.Value(0));
  const [heights, setHeights] = useState<[number, number]>([0, 0]);

  const measure = useCallback(
    (index: 0 | 1) => (e: LayoutChangeEvent) => {
      const next = e.nativeEvent.layout.height;
      setHeights((current) =>
        Math.abs(current[index] - next) < 1
          ? current
          : ((index === 0 ? [next, current[1]] : [current[0], next]) as [number, number]),
      );
    },
    [],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: step, ...SLIDE, useNativeDriver: true }),
      Animated.timing(grow, { toValue: step, ...SLIDE, useNativeDriver: false }),
    ]).start();
  }, [step, slide, grow]);

  const reset = useCallback(() => {
    setStep(0);
    setShowErrors(false);
    setError(null);
    setSubmitting(false);
    slide.setValue(0);
    grow.setValue(0);
  }, [slide, grow]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    onClose();
    setTimeout(reset, 260);
  }, [onClose, reset]);

  const onPay = useCallback(async () => {
    if (!basket || !method) return;

    setShowErrors(true);
    const chosen = methods.find((m) => m.id === method) ?? null;
    const nameMissing = !knownAs && details.fullName.trim().length < 2;
    if (nameMissing || phoneProblem(details.phone, 'ETB', chosen) !== null) return;

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);

    try {
      const response = await startCinemaCheckout({
        ...basket,
        phoneNumber: formatPhoneForPayment(details.phone, 'ETB', provider),
        customerName: (knownAs || details.fullName).trim() || 'Cinema Guest',
        customerEmail: checkoutEmail(details.email, user?.email),
        method,
      });

      onClose();
      setTimeout(reset, 260);
      // Navigate before opening any browser, so the order watcher — which is
      // what actually settles the order — is already running underneath the
      // card checkout, the same reasoning the event flow's onPay follows.
      router.push(`/cinema-order/${response.transactionId}`);

      if (response.checkoutUrl) {
        await WebBrowser.openBrowserAsync(response.checkoutUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          toolbarColor: '#08080A',
          controlsColor: '#FFFFFF',
        });
      }
    } catch (err) {
      setSubmitting(false);
      const message =
        err instanceof ApiError ? err.message : 'We could not start that payment. Try again.';
      setError(message);
      if (/seat/i.test(message)) {
        onClose();
        setTimeout(reset, 260);
        onSeatConflict();
      }
    }
  }, [basket, method, methods, knownAs, details, provider, user, onClose, reset, router, onSeatConflict]);

  const travel = width * TRAVEL;
  const stepStyles = [
    {
      opacity: slide.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0] }),
      transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, -travel] }) }],
    },
    {
      opacity: slide.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1] }),
      transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [travel, 0] }) }],
    },
  ];

  const measured = heights[0] > 0 && heights[1] > 0;

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.header}>
        {step === 1 ? (
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Back to snacks"
            onPress={() => setStep(0)}
            pressedScale={0.9}
            style={[styles.headerButton, { backgroundColor: theme.surfaceMuted }]}>
            <Ionicons name="chevron-back" size={18} color={theme.text} />
          </Touchable>
        ) : null}
        <Text variant="title" style={styles.headerTitle}>
          {step === 0 ? 'Snacks' : 'Payment'}
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

      <Animated.View
        style={[
          styles.stage,
          measured
            ? { height: grow.interpolate({ inputRange: [0, 1], outputRange: heights }) }
            : null,
        ]}>
        <Animated.View
          style={[styles.step, stepStyles[0]]}
          onLayout={measure(0)}
          pointerEvents={step === 0 ? 'auto' : 'none'}
          accessibilityElementsHidden={step !== 0}
          importantForAccessibility={step === 0 ? 'auto' : 'no-hide-descendants'}>
          <SnacksStep
            concessions={concessions}
            loading={concessionsLoading}
            selected={store.concessions}
            onChangeQuantity={onChangeQuantity}
            total={quote?.total ?? 0}
            quoting={quoting}
            onContinue={() => setStep(1)}
          />
        </Animated.View>

        <Animated.View
          style={[styles.step, stepStyles[1]]}
          onLayout={measure(1)}
          pointerEvents={step === 1 ? 'auto' : 'none'}
          accessibilityElementsHidden={step !== 1}
          importantForAccessibility={step === 1 ? 'auto' : 'no-hide-descendants'}>
          <PaymentStep
            methods={methods}
            selectedMethod={method}
            onSelectMethod={setPicked}
            details={details}
            onChangeDetails={setEdits}
            knownAs={knownAs}
            currency="ETB"
            total={quote?.total ?? 0}
            summary={summary}
            showErrors={showErrors}
            submitting={submitting}
            error={error}
            onPay={onPay}
          />
        </Animated.View>
      </Animated.View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerTitle: { flex: 1 },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: { overflow: 'hidden' },
  step: { position: 'absolute', left: 0, right: 0, top: 0 },
});
