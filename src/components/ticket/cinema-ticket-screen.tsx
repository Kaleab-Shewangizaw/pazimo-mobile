import { Ionicons } from '@expo/vector-icons';
import { BlurTargetView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CinemaTicketView } from '@/components/ticket/cinema-ticket-view';
import { SeatsConcessionsSheet } from '@/components/ticket/seats-concessions-sheet';
import { ShareItemSheet } from '@/components/shares/share-item-sheet';
import { Button } from '@/components/ui/button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveImageUrl } from '@/lib/media';
import type { ShareKind } from '@/lib/share-item-view-model';
import type { CinemaOrder } from '@/types/api';

/**
 * `TicketScreen`'s cinema counterpart — but one card for the whole order
 * rather than a pager over one card per seat. `CinemaTicketView` already
 * folds every seat's QR and the order's snacks onto that single card, so this
 * screen is just the chrome around it: header, reveal wrapper, a Done button.
 *
 * Lit by the movie's own poster, blurred to near-abstraction, the same way
 * `TicketScreen` is lit by the event's cover art — and the reason this screen
 * needs a `BlurTargetView` at all: Android's real glass has to sample *some*
 * static backdrop, and there was nothing behind the card for it to see before.
 *
 * Download/share is intentionally not here yet — closing the loop this screen
 * exists for (pay → see a scannable ticket) doesn't need it, and the event
 * side's version (`useTicketDownload`/`TicketPoster`) is real plumbing worth
 * adding on its own pass rather than folding in here.
 */

export type CinemaTicketScreenProps = {
  order: CinemaOrder;
  onDone: () => void;
  children?: (ticket: ReactNode) => ReactNode;
};

export function CinemaTicketScreen({
  order,
  onDone,
  children,
}: CinemaTicketScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const backdropRef = useRef<View>(null);
  const [shareVisible, setShareVisible] = useState(false);
  const [seatsVisible, setSeatsVisible] = useState(false);

  // One order can hold both a ticket and a snack — the sheet's kind picker
  // only offers what this order actually has, and skips itself entirely
  // when there's just one.
  const allowedKinds = useMemo<ShareKind[]>(() => {
    const kinds: ShareKind[] = [];
    if (order.tickets.some((t) => t.status === 'active'))
      kinds.push('CINEMA_TICKET');
    if (
      order.concessions.some((c) => c.status === 'confirmed' && !c.redeemedAt)
    )
      kinds.push('CINEMA_CONCESSION');
    return kinds;
  }, [order.tickets, order.concessions]);

  const forcedKind = allowedKinds.length === 1 ? allowedKinds[0] : undefined;
  const nothingToSend = allowedKinds.length === 0;

  if (!order.tickets.length) return null;

  const poster = resolveImageUrl(order.tickets[0]?.movie.poster);

  const body = (
    <View style={styles.single}>
      <CinemaTicketView
        order={order}
        fill
        glass
        blurTarget={backdropRef}
        onShowSeats={() => setSeatsVisible(true)}
      />
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <BlurTargetView
        ref={backdropRef}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {poster ? (
          <Image
            source={{ uri: poster }}
            style={[StyleSheet.absoluteFill, styles.backdrop]}
            contentFit="cover"
            blurRadius={60}
            transition={0}
            cachePolicy="memory-disk"
          />
        ) : null}
        <LinearGradient
          colors={['rgba(8,8,10,0.72)', 'rgba(8,8,10,0.9)', '#08080A']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </BlurTargetView>

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerSpacer} />
        <Text variant="title" numberOfLines={1} style={styles.headerTitle}>
          {order.tickets.length > 1 ? 'Your tickets' : 'Your ticket'}
        </Text>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Send to a friend"
          accessibilityState={{ disabled: nothingToSend }}
          disabled={nothingToSend}
          onPress={() => setShareVisible(true)}
          pressedScale={0.9}
          style={[
            styles.headerButton,
            nothingToSend ? styles.headerButtonDisabled : null,
          ]}
        >
          <Ionicons name="paper-plane-outline" size={20} color="#FFFFFF" />
        </Touchable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.bodyFlex}>{children ? children(body) : body}</View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}
      >
        <Button label="Done" size="lg" onPress={onDone} style={styles.done} />
      </View>

      <ShareItemSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        forcedKind={forcedKind}
        allowedKinds={allowedKinds}
      />

      <SeatsConcessionsSheet
        visible={seatsVisible}
        onClose={() => setSeatsVisible(false)}
        order={order}
      />
    </View>
  );
}

const HEADER_BUTTON = 36;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backdrop: { opacity: 0.75 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerSpacer: { width: HEADER_BUTTON },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerButton: {
    width: HEADER_BUTTON,
    height: HEADER_BUTTON,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonDisabled: { opacity: 0.35 },

  // `flexGrow` (not `flex`) — a content container only ever grows past its
  // content's natural size, so a tall ticket still scrolls instead of being
  // clipped to the viewport.
  content: { flexGrow: 1, paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl },
  bodyFlex: { flex: 1 },
  single: { flex: 1, paddingHorizontal: Spacing.lg },

  footer: { paddingHorizontal: Spacing.lg },
  done: { width: '100%' },
});
