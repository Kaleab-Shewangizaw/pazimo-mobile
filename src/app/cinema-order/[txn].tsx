import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CinemaTicketScreen } from '@/components/ticket/cinema-ticket-screen';
import { TicketFrame } from '@/components/ticket/ticket-frame';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { abandonCinemaOrder, useCinemaOrderWatcher } from '@/hooks/use-cinema-order-watcher';
import { useTheme } from '@/hooks/use-theme';

/**
 * The screen a cinema payment lands on — `checkout/[txn].tsx`'s counterpart.
 * Same reasoning throughout: the poll running here is what actually settles
 * the order when the provider webhook can't reach a local backend, so leaving
 * early can genuinely cost a paid-for seat, and the reveal keeps one card on
 * screen rather than crossfading between a notice and a ticket.
 */

const REVEAL_DURATION = 900;

const FAILURE_COPY: Record<string, { icon: keyof typeof Ionicons.glyphMap; title: string }> = {
  cancelled: { icon: 'close-circle-outline', title: 'Payment cancelled' },
  failed: { icon: 'alert-circle-outline', title: 'Payment failed' },
  timeout: { icon: 'time-outline', title: 'Still waiting' },
  error: { icon: 'cloud-offline-outline', title: 'Something went wrong' },
};

export default function CinemaOrderScreen() {
  const { txn } = useLocalSearchParams<{ txn: string }>();
  const router = useRouter();

  const { phase, order, message } = useCinemaOrderWatcher(txn);

  const [reveal] = useState(() => new Animated.Value(0));
  const [turned, setTurned] = useState(false);

  useEffect(() => {
    if (phase !== 'issued' || !order) return;
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
  }, [phase, order, reveal]);

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
    if (txn) abandonCinemaOrder(txn);
    leave();
  }, [txn, leave]);

  const done = useCallback(() => router.replace('/(tabs)/cinema'), [router]);

  return (
    <View style={styles.screen}>
      {order ? (
        <CinemaTicketScreen order={order} onDone={done}>
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
        </CinemaTicketScreen>
      ) : null}

      {!turned ? (
        <WaitingOverlay
          reveal={reveal}
          phase={phase}
          message={message}
          onCancel={abandon}
          onLeave={leave}
          onDone={done}
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
  onDone,
}: {
  reveal: Animated.Value;
  phase: string;
  message?: string;
  onCancel: () => void;
  onLeave: () => void;
  onDone: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const backdrop = useRef<View>(null);
  const failure = phase !== 'waiting' && phase !== 'issued' ? FAILURE_COPY[phase] : null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { opacity: reveal.interpolate({ inputRange: [0, 0.45], outputRange: [1, 0] }) },
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
                      'We stopped waiting for this payment. If it went through, your ticket will be in your order history.'}
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
              <Button label="Back to the movie" size="lg" onPress={onLeave} style={styles.wide} />
              <Button label="Browse cinema" variant="ghost" onPress={onDone} style={styles.wide} />
            </>
          ) : (
            <Button label="Cancel payment" variant="ghost" onPress={onCancel} style={styles.wide} />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stage: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.xl },
  card: { flex: 1, width: '100%' },
  blank: { flex: 1 },
  cardBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  cardFooter: { height: 152 },
  centered: { textAlign: 'center' },
  actions: { gap: Spacing.xs },
  wide: { width: '100%' },
});
