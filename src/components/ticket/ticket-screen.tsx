import { Ionicons } from '@expo/vector-icons';
import { BlurTargetView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TicketPoster, posterHostStyle } from '@/components/ticket/ticket-poster';
import { TicketView } from '@/components/ticket/ticket-view';
import { Button } from '@/components/ui/button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTicketDownload } from '@/hooks/use-ticket-download';
import { formatTicketDate } from '@/lib/date';
import { eventCoverUrl } from '@/lib/media';
import type { Ticket } from '@/types/api';

/**
 * One event's tickets, full screen — the same composition whether they were just
 * bought or opened from the list, so the thing the buyer sees at the moment of
 * purchase is literally the thing they will find again later.
 *
 * Several tickets for one event ride a horizontal pager rather than a list. Each
 * is a separate admission with its own QR, and at a door you are holding *one*
 * of them up: paging keeps exactly one code on screen at full size, which a
 * vertical list of half-sized cards would not.
 *
 * The page is lit by the event's own artwork, blurred to near-abstraction. That
 * is what makes each ticket feel like it belongs to its event rather than to a
 * generic wallet.
 */

const HEADER_HEIGHT = 44;

export type TicketScreenProps = {
  tickets: Ticket[];
  /** Which ticket to open on — the one that was tapped. */
  initialIndex?: number;
  onBack: () => void;
  /** Replaces the back chevron's meaning after a purchase. */
  backLabel?: string;
  /** Slotted above the download button — used by the reveal to add "See all tickets". */
  footer?: ReactNode;
  /** Wraps the ticket itself, so the reveal can flip it in. */
  children?: (ticket: ReactNode) => ReactNode;
};

export function TicketScreen({
  tickets,
  initialIndex = 0,
  onBack,
  backLabel = 'Go back',
  footer,
  children,
}: TicketScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const backdropRef = useRef<View>(null);
  const pagerRef = useRef<ScrollView>(null);
  const jumped = useRef(false);

  const [index, setIndex] = useState(() => Math.min(Math.max(initialIndex, 0), tickets.length - 1));
  const active = tickets[index] ?? tickets[0];

  const { posterRef, download, saving } = useTicketDownload(active);
  // The floating footer grows by a whole button when a caller passes one, so
  // the scroll's clearance is measured rather than guessed at.
  const [footerHeight, setFooterHeight] = useState(0);

  const cover = eventCoverUrl(active?.event.coverImages);
  const many = tickets.length > 1;

  const onShare = useCallback(() => {
    if (!active) return;
    Share.share({
      message: `${active.event.title} — ${formatTicketDate(
        active.event.startDate,
        active.event.startTime,
      )}\nTicket ${active.ticketId} on Pazimo`,
    }).catch(() => {
      // Dismissed; nothing to recover from.
    });
  }, [active]);

  const onPage = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex((current) => (current === next ? current : next));
    },
    [width],
  );

  // Only ever fires once: after the opening jump this is just a resize, and
  // re-running it would yank the pager back whenever the keyboard or rotation
  // changed the content size.
  const jumpToInitial = useCallback(() => {
    if (jumped.current || index === 0) return;
    jumped.current = true;
    pagerRef.current?.scrollTo({ x: index * width, animated: false });
  }, [index, width]);

  if (!active) return null;

  // Sized here rather than inside the card: every page is one screen wide, so
  // the ticket has to know how much of that is actually its own.
  const cardWidth = width - Spacing.lg * 2;

  const body = many ? (
    <ScrollView
      ref={pagerRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={onPage}
      // `contentOffset` is iOS-only on ScrollView, so the opening page is set
      // imperatively once the pages have a width to be measured against.
      onContentSizeChange={jumpToInitial}>
      {tickets.map((ticket) => (
        <View key={ticket._id} style={[styles.page, { width }]}>
          <TicketView ticket={ticket} width={cardWidth} />
        </View>
      ))}
    </ScrollView>
  ) : (
    <View style={styles.single}>
      <TicketView ticket={active} width={cardWidth} />
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <BlurTargetView ref={backdropRef} style={StyleSheet.absoluteFill} pointerEvents="none">
        {cover ? (
          <Image
            source={{ uri: cover }}
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
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={onBack}
          pressedScale={0.9}
          style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Touchable>
        <View style={styles.headerTitles}>
          <Text variant="title" numberOfLines={1} style={styles.headerTitle}>
            {many ? 'Your tickets' : 'Your ticket'}
          </Text>
          {many ? (
            <Text
              variant="caption"
              color="textSecondary"
              style={styles.headerTitle}
              accessibilityLiveRegion="polite">
              {index + 1} of {tickets.length}
            </Text>
          ) : null}
        </View>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Share this ticket"
          onPress={onShare}
          pressedScale={0.9}
          style={styles.headerButton}>
          <Ionicons name="share-outline" size={21} color="#FFFFFF" />
        </Touchable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: footerHeight + Spacing.lg },
        ]}>
        {children ? children(body) : body}

        {many ? (
          <View style={styles.dots} accessibilityElementsHidden>
            {tickets.map((ticket, i) => (
              <View
                key={ticket._id}
                style={[
                  styles.dot,
                  i === index ? styles.dotActive : { backgroundColor: theme.textMuted },
                ]}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        {footer}
        <Button
          label={many ? `Download ticket ${index + 1}` : 'Download ticket'}
          size="lg"
          loading={saving}
          onPress={download}
          icon={<Ionicons name="download-outline" size={18} color={theme.onBrand} />}
          style={styles.download}
        />
      </View>

      {/* Drawn but parked off-screen: this is what `download` rasterises. Only
          the visible ticket gets one, so a ten-ticket order still mounts one. */}
      <View style={posterHostStyle} pointerEvents="none" aria-hidden>
        <TicketPoster ref={posterRef} ticket={active} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backdrop: { opacity: 0.75 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerButton: {
    width: HEADER_HEIGHT,
    height: HEADER_HEIGHT,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: { flex: 1 },
  headerTitle: { textAlign: 'center' },

  content: { paddingTop: Spacing.sm, gap: Spacing.lg },
  // The pager spans the full screen so each page snaps edge to edge, which is
  // why the horizontal inset lives on the page rather than on the scroll.
  page: { paddingHorizontal: Spacing.lg },
  single: { paddingHorizontal: Spacing.lg },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: Radius.pill },
  dotActive: { backgroundColor: '#FFFFFF', width: 18 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  download: { width: '100%' },
});
