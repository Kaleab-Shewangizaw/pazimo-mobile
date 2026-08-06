import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cancelPayment } from '@/api/payments';
import { TicketFrame } from '@/components/ticket/ticket-frame';
import { TicketScreen } from '@/components/ticket/ticket-screen';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { usePaymentWatcher } from '@/hooks/use-payment-watcher';
import { useTheme } from '@/hooks/use-theme';

/**
 * The screen a payment lands on. It owns the two moments that matter: the wait,
 * and the ticket appearing.
 *
 * The wait is not decorative. `usePaymentWatcher`'s poll is what actually mints
 * the ticket when the provider webhook doesn't reach the backend, so leaving
 * this screen early can genuinely cost someone a ticket they paid for — which
 * is why the hardware back button is held until the payment resolves.
 *
 * The reveal is one object turning over, not a crossfade between two screens.
 * That only works if both halves are on screen at once, so the waiting card
 * stays mounted — as an overlay above the finished ticket — until its own
 * half-turn is done.
 */

/** Long enough to read as a card turning over, short enough not to be a wait. */
const REVEAL_DURATION = 900;

const FAILURE_COPY: Record<string, { icon: keyof typeof Ionicons.glyphMap; title: string }> = {
  cancelled: { icon: 'close-circle-outline', title: 'Payment cancelled' },
  failed: { icon: 'alert-circle-outline', title: 'Payment failed' },
  timeout: { icon: 'time-outline', title: 'Still waiting' },
  error: { icon: 'cloud-offline-outline', title: 'Something went wrong' },
};

export default function CheckoutScreen() {
  const { txn } = useLocalSearchParams<{ txn: string }>();
  const router = useRouter();

  const { phase, tickets, message } = usePaymentWatcher(txn);
  const ticket = tickets[0];

  const [reveal] = useState(() => new Animated.Value(0));
  // Drops the waiting card only once it has finished turning away, so the flip
  // is never cut short by an unmount.
  const [turned, setTurned] = useState(false);

  useEffect(() => {
    if (phase !== 'issued' || !ticket) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
        // A device without a taptic engine must not throw.
      });
    }
    Animated.timing(reveal, {
      toValue: 1,
      duration: REVEAL_DURATION,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setTurned(true);
    });
  }, [phase, ticket, reveal]);

  // While money is in flight there is nothing behind this screen worth going
  // back to, and leaving stops the poll that issues the ticket.
  useEffect(() => {
    if (phase !== 'waiting') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [phase]);

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  const abandon = useCallback(() => {
    if (txn) {
      cancelPayment(txn).catch(() => {
        // Best effort: the server expires an unclaimed intent after three
        // minutes anyway, so a failed cancel changes nothing for the buyer.
      });
    }
    leave();
  }, [txn, leave]);

  const toTickets = useCallback(() => router.replace('/(tabs)/tickets'), [router]);

  return (
    <View style={styles.screen}>
      {ticket ? (
        <TicketScreen
          tickets={tickets}
          onBack={toTickets}
          backLabel="Go to your tickets">
          {(body) => (
            <Animated.View
              style={{
                opacity: reveal.interpolate({ inputRange: [0.5, 0.62], outputRange: [0, 1] }),
                transform: [
                  { perspective: 1200 },
                  {
                    rotateY: reveal.interpolate({
                      inputRange: [0.5, 1],
                      outputRange: ['-90deg', '0deg'],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              }}>
              {body}
            </Animated.View>
          )}
        </TicketScreen>
      ) : null}

      {!turned ? (
        <WaitingOverlay
          reveal={reveal}
          phase={phase}
          message={message}
          onCancel={abandon}
          onLeave={leave}
          onTickets={toTickets}
        />
      ) : null}
    </View>
  );
}

function WaitingOverlay({
  reveal,
  phase,
  message,
  onCancel,
  onLeave,
  onTickets,
}: {
  reveal: Animated.Value;
  phase: string;
  message?: string;
  onCancel: () => void;
  onLeave: () => void;
  onTickets: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const backdrop = useRef<View>(null);
  const failure = phase !== 'waiting' && phase !== 'issued' ? FAILURE_COPY[phase] : null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: reveal.interpolate({ inputRange: [0, 0.45], outputRange: [1, 0] }),
        },
      ]}
      pointerEvents={phase === 'issued' ? 'none' : 'auto'}>
      <AmbientBackground blurTarget={backdrop} />

      <View style={[styles.stage, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { perspective: 1200 },
                {
                  rotateY: reveal.interpolate({
                    inputRange: [0, 0.5],
                    outputRange: ['0deg', '90deg'],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}>
          {/* Empty on purpose. The wait has nothing to report that the buyer
              doesn't already know — they are staring at their own phone waiting
              for a prompt — so it is the outline of the ticket they are buying,
              full size, with the light going round it. The flip at the end then
              turns *that* object over rather than trading a notice for a ticket.
              Failures are the exception: those have to say what went wrong. */}
          <TicketFrame
            fill
            glass
            blurTarget={backdrop}
            glowing={phase === 'waiting'}
            stub={
              failure ? (
                <View style={styles.cardBody}>
                  <Ionicons name={failure.icon} size={40} color={theme.text} />
                  <Text variant="title" style={styles.centered}>
                    {failure.title}
                  </Text>
                  <Text variant="small" color="textSecondary" style={styles.centered}>
                    {message ??
                      'We stopped waiting for this payment. If it went through, your ticket will be in the Tickets tab.'}
                  </Text>
                </View>
              ) : (
                <View style={styles.blank} />
              )
            }
            details={<View style={styles.cardFooter} />}
          />
        </Animated.View>

        <View style={styles.actions}>
          {failure ? (
            <>
              <Button label="Back to the event" size="lg" onPress={onLeave} style={styles.wide} />
              <Button
                label="Check my tickets"
                variant="ghost"
                onPress={onTickets}
                style={styles.wide}
              />
            </>
          ) : (
            <Button
              label="Cancel payment"
              variant="ghost"
              onPress={onCancel}
              style={styles.wide}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stage: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  card: { flex: 1, width: '100%' },
  blank: { flex: 1 },
  cardBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  // Matched to the height of the real ticket's three detail rows, so the tear
  // lands in the same place before and after the flip.
  cardFooter: { height: 152 },
  centered: { textAlign: 'center' },
  actions: { gap: Spacing.xs },
  wide: { width: '100%' },
});
