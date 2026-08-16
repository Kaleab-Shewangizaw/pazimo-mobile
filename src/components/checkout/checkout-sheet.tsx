import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  type LayoutChangeEvent,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { ApiError } from '@/api/client';
import { initiateTicketPayment, providerFor } from '@/api/payments';
import { type BuyerDetails, PaymentStep } from '@/components/checkout/payment-step';
import { TierStep } from '@/components/checkout/tier-step';
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
import { availableCurrencies, tierUnitPrice } from '@/lib/pricing';
import { usePaymentConfig } from '@/queries/payments';
import { useAuthStore } from '@/stores/use-auth-store';
import type { Currency, PaymentMethodId, PazimoEvent } from '@/types/api';

/**
 * The whole purchase, in one sheet.
 *
 * Picking a tier and choosing how to pay are two views of the same decision, so
 * they slide past each other inside the sheet rather than becoming two routes.
 * Only once money is actually moving does the app change screens — to the
 * checkout watcher, which is where the ticket is issued.
 *
 * The transition is two `Animated.Value`s, not one: transforms and opacity run
 * on the native driver, while the sheet's height cannot (layout props are JS
 * only). Sharing a single value between the two would trip React Native's
 * "JS driven animation on a node moved to native" guard.
 */

const SLIDE = {
  duration: 320,
  easing: Easing.bezier(0.32, 0.72, 0, 1),
} as const;

/** How far each step travels; a fraction of the width, so it reads as a page turn. */
const TRAVEL = 0.28;

export type CheckoutSheetProps = {
  visible: boolean;
  onClose: () => void;
  event: PazimoEvent;
};

export function CheckoutSheet({ visible, onClose, event }: CheckoutSheetProps) {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { config } = usePaymentConfig();
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);

  const currencies = useMemo(() => availableCurrencies(event), [event]);
  const [currency, setCurrency] = useState<Currency | null>(null);
  const activeCurrency = currency ?? currencies[0];

  const tiers = event.ticketTypes ?? [];
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const selectedTier = tiers.find((t) => t._id === selectedTierId) ?? null;
  const total = selectedTier ? tierUnitPrice(selectedTier, activeCurrency) * quantity : 0;

  const provider = providerFor(activeCurrency, config.activeProvider);
  const methods = useMemo(
    () => methodsFor(activeCurrency, config.activeProvider),
    [activeCurrency, config.activeProvider],
  );

  const [step, setStep] = useState<0 | 1>(0);
  const [picked, setPicked] = useState<PaymentMethodId | null>(null);
  const [edits, setEdits] = useState<Partial<BuyerDetails>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Switching currency can invalidate the chosen rail entirely — ETB wallets
  // are not offered for USD, and the two providers spell their ids
  // differently. Derived rather than reset in an effect, so a stale id can
  // never be live for even one render.
  const method = picked && methods.some((m) => m.id === picked) ? picked : null;

  // A buyer whose account already carries a name is never asked for one again —
  // the payment step drops to a rail and a number. Everything still flows
  // through `details` so the request body is built the same way either way.
  const accountName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const knownAs = accountName || null;

  // The account is the default *under* whatever has been typed, not a one-time
  // seed, so a buyer who signs in mid-flow sees the form fill itself. Phone
  // numbers are stored in whatever shape they were created in, so they are
  // normalised back to the nine local digits the field expects.
  const details: BuyerDetails = useMemo(
    () => ({
      fullName: edits.fullName ?? accountName,
      phone: edits.phone ?? localEthiopianDigits(user?.phoneNumber ?? ''),
      // A `customerpazimo…` address is the placeholder checkout mints for
      // buyers who skipped the field; offering it back as theirs would be a lie.
      email: edits.email ?? (user?.email?.includes('customerpazimo') ? '' : (user?.email ?? '')),
    }),
    [edits, accountName, user],
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
    // Left until after the dismissal animation so the sheet doesn't visibly
    // snap back to step one on its way off screen.
    setTimeout(reset, 260);
  }, [onClose, reset]);

  const onPay = useCallback(async () => {
    if (!selectedTier || !method) return;

    setShowErrors(true);
    const chosen = methods.find((m) => m.id === method) ?? null;
    // The name is only the buyer's to get wrong when we had to ask for it.
    const nameMissing = !knownAs && details.fullName.trim().length < 2;
    if (nameMissing || phoneProblem(details.phone, activeCurrency, chosen) !== null) {
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);

    // The reference is minted here, not by the server, because it is also the
    // key the status poll and the ticket lookup are keyed on afterwards.
    const orderId = `pzm_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    try {
      const response = await initiateTicketPayment(
        {
          currency: activeCurrency,
          paymentReason: `Ticket Purchase - ${event.title}`,
          phoneNumber: formatPhoneForPayment(details.phone, activeCurrency, provider),
          orderId,
          method,
          ticketDetails: {
            ticketId: orderId,
            eventId: event._id,
            ticketTypeId: selectedTier._id,
            quantity,
            userId: user?._id,
            fullName: details.fullName.trim(),
            email: checkoutEmail(details.email, user?.email),
          },
        },
        provider,
      );

      // Guest checkout creates the account server-side and hands back its
      // session — persisting it here is what makes the ticket show up under
      // "my tickets" from this moment on, without a sign-in step.
      if (response.token && response.user && !user) {
        const { id, ...rest } = response.user;
        await signIn({ token: response.token, user: { ...rest, _id: id, id } });
      }

      onClose();
      setTimeout(reset, 260);
      // Navigate *before* opening any browser, so the status poll — which is
      // what actually issues the ticket — is already running underneath the
      // card checkout. By the time the buyer dismisses the browser, the ticket
      // is usually already on screen behind it.
      router.push(`/checkout/${response.transactionId}`);

      if (response.checkoutUrl) {
        await WebBrowser.openBrowserAsync(response.checkoutUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          toolbarColor: '#08080A',
          controlsColor: '#FFFFFF',
        });
      }
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof ApiError ? err.message : 'We could not start that payment. Try again.',
      );
    }
  }, [
    activeCurrency,
    details,
    event,
    knownAs,
    method,
    methods,
    onClose,
    provider,
    quantity,
    reset,
    router,
    selectedTier,
    signIn,
    user,
  ]);

  const travel = width * TRAVEL;
  const stepStyles = [
    {
      opacity: slide.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0] }),
      transform: [
        { translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, -travel] }) },
      ],
    },
    {
      opacity: slide.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1] }),
      transform: [
        { translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [travel, 0] }) },
      ],
    },
  ];

  const measured = heights[0] > 0 && heights[1] > 0;

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.header}>
        {step === 1 ? (
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Back to tickets"
            onPress={() => setStep(0)}
            pressedScale={0.9}
            style={[styles.headerButton, { backgroundColor: theme.surfaceMuted }]}>
            <Ionicons name="chevron-back" size={18} color={theme.text} />
          </Touchable>
        ) : null}
        <Text variant="title" style={styles.headerTitle}>
          {step === 0 ? 'Select tickets' : 'Payment'}
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
          // Until both steps have reported a height there is nothing to
          // interpolate between, so the stage stays auto-height and simply
          // takes the shape of whichever step is mounted.
          measured
            ? { height: grow.interpolate({ inputRange: [0, 1], outputRange: heights }) }
            : null,
        ]}>
        <Animated.View
          style={[styles.step, stepStyles[0]]}
          onLayout={measure(0)}
          pointerEvents={step === 0 ? 'auto' : 'none'}
          // Hidden from screen readers when parked, or both steps read at once.
          accessibilityElementsHidden={step !== 0}
          importantForAccessibility={step === 0 ? 'auto' : 'no-hide-descendants'}>
          <TierStep
            tiers={tiers}
            currency={activeCurrency}
            currencies={currencies}
            onChangeCurrency={setCurrency}
            selectedTierId={selectedTierId}
            onSelectTier={(tierId) => {
              setSelectedTierId(tierId);
              setQuantity(1);
            }}
            quantity={quantity}
            onChangeQuantity={setQuantity}
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
            currency={activeCurrency}
            total={total}
            summary={
              selectedTier
                ? quantity > 1
                  ? `${quantity} × ${selectedTier.name}`
                  : selectedTier.name
                : ''
            }
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
