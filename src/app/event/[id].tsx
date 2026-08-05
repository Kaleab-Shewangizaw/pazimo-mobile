import { Ionicons } from '@expo/vector-icons';
import { BlurTargetView } from 'expo-blur';
import { Image, type ImageLoadEventData } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { CheckoutSheet } from '@/components/checkout/checkout-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { GlassButton, GlassIconButton } from '@/components/ui/glass-button';
import { Touchable } from '@/components/ui/pressable';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { SectionHeader } from '@/components/ui/section';
import { ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { AspectRatio, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { formatLongDate } from '@/lib/date';
import { eventCoverUrl, resolveImageUrl } from '@/lib/media';
import { organizerDisplayName } from '@/lib/organizer';
import { isSoldOut } from '@/lib/pricing';
import { useEvent } from '@/queries/events';

/** Floating chrome — the scroll starts below it. */
const HEADER_HEIGHT = 44;

/** Breathing room between the chrome and the top of the artwork. */
const POSTER_TOP = Spacing.xl;

/**
 * The floating buy bar's own footprint — its top padding plus a `lg` Button
 * (`Spacing.lg` above and below a `callout` line). The scroll pads itself by
 * exactly this much so a collapsed description doesn't strand a screenful of
 * empty page under the last block.
 */
const BUY_BAR_HEIGHT = Spacing.md + Spacing.lg * 2 + 22;

/** Preview lines before the description clamps behind "Read more". */
const DESC_PREVIEW_LINES = 4;

const GALLERY_CARD_WIDTH = 116;

function ExpandToggle({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: 'chevron-down' | 'chevron-up';
  onPress: () => void;
}) {
  return (
    <Touchable accessibilityRole="button" onPress={onPress} pressedScale={0.96} style={styles.readMore}>
      <Text variant="small" style={styles.readMoreText}>
        {label}
      </Text>
      <Ionicons name={icon} size={13} color="#FFFFFF" />
    </Touchable>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();

  // Android needs an explicit view to sample for its blur (SDK 57+). The page
  // backdrop is deliberately static, which is what makes it a cheap target.
  const backdropRef = useRef<View>(null);

  const { data: event, isLoading, isError, error, refetch } = useEvent(id);
  // Tier, currency, quantity and payment details all live inside the sheet —
  // this page only decides whether it is open.
  const [sheetVisible, setSheetVisible] = useState(false);
  // UI-only for now — there is no favorites endpoint yet, so the heart does
  // not survive leaving the screen.
  const [saved, setSaved] = useState(false);
  const [coverReady, setCoverReady] = useState(false);
  // The artwork's own proportions, so the poster frame can take its shape
  // instead of cropping it to a fixed one. Arrives with `onLoad`, which is the
  // same event that unblocks the reveal — so the page still lands in one frame.
  const [coverRatio, setCoverRatio] = useState<number | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  // Full (unclamped) line count, measured by an invisible twin of the
  // description — `onTextLayout` on a clamped Text only reports the visible
  // lines, so it can't tell us whether anything was cut off.
  const [descLines, setDescLines] = useState<number | null>(null);
  // Until the measurement lands (react-native-web never fires onTextLayout),
  // fall back to a length heuristic: ~45 chars/line at body size, 4 lines.
  const description = event?.description ?? '';
  const descOverflows =
    descLines !== null
      ? descLines > DESC_PREVIEW_LINES
      : description.length > 180 || (description.match(/\n/g)?.length ?? 0) >= DESC_PREVIEW_LINES;

  const tiers = event?.ticketTypes ?? [];
  const soldOut = event ? isSoldOut(event) : false;

  const cover = eventCoverUrl(event?.coverImages);
  const organizer = event ? organizerDisplayName(event) : null;

  const venue = [event?.location?.address, event?.location?.city].filter(Boolean).join(', ');

  // `eventImages` carries the same three URL shapes as the cover, and the
  // unresolvable seed default comes back as null.
  const gallery = useMemo(
    () =>
      (event?.eventImages ?? [])
        .map((image) => ({ uri: resolveImageUrl(image.url), caption: image.caption }))
        .filter((image): image is { uri: string; caption: string | undefined } => Boolean(image.uri)),
    [event?.eventImages],
  );

  const onCoverLoad = useCallback((e: ImageLoadEventData) => {
    const { width, height } = e.source;
    if (width > 0 && height > 0) setCoverRatio(width / height);
    setCoverReady(true);
  }, []);

  const openSheet = useCallback(() => setSheetVisible(true), []);

  const onShare = useCallback(() => {
    if (!event) return;
    Share.share({ message: `${event.title} — on Pazimo` }).catch(() => {
      // User dismissed the sheet; nothing to recover from.
    });
  }, [event]);

  // Worth pulling on: tier inventory and sold-out state are the parts of this
  // page most likely to have moved since it was cached.
  const { refreshing, onRefresh } = useRefresh(refetch);

  // Nothing shows until data AND artwork are in — a spinner on plain
  // background, then the whole composition lands in one frame instead of
  // glow-then-photo-then-text.
  const ready = !isLoading && Boolean(event) && (!cover || coverReady);

  if (isError) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <ErrorState
          message={error instanceof ApiError ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Ambient backdrop — the cover blown up and blurred to near-abstraction,
          so the page is lit by the artwork's own colour instead of sitting on
          flat black. Static, which is what makes it a cheap blur target. */}
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
          colors={['rgba(8,8,10,0.55)', 'rgba(8,8,10,0.86)', '#08080A']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </BlurTargetView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.sm + HEADER_HEIGHT + POSTER_TOP,
            paddingBottom: insets.bottom + BUY_BAR_HEIGHT + Spacing.lg,
          },
        ]}
        refreshControl={
          <PageRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={insets.top + Spacing.sm + HEADER_HEIGHT}
          />
        }>
        {event ? (
          <>
            <View style={styles.posterBlock}>
              <View
                style={[
                  styles.poster,
                  // Falls back to a sane frame only while the artwork's real
                  // shape is unknown — which the reveal gate means nobody sees.
                  { aspectRatio: coverRatio ?? AspectRatio.hero, borderColor: theme.glassBorder },
                ]}>
                {cover ? (
                  <Image
                    source={{ uri: cover }}
                    style={StyleSheet.absoluteFill}
                    // The frame already carries the artwork's own ratio, so
                    // there is nothing left for `cover` to crop.
                    contentFit="cover"
                    // No fade of its own — the loading overlay owns the reveal,
                    // so photo, backdrop and text all land in the same frame.
                    transition={0}
                    priority="high"
                    cachePolicy="memory-disk"
                    onLoad={onCoverLoad}
                    // A broken URL must not strand the spinner.
                    onError={() => setCoverReady(true)}
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surfaceMuted }]} />
                )}
              </View>
            </View>

            <View style={styles.block}>
              <Text variant="display" role="heading" style={styles.title}>
                {event.title}
              </Text>

              <View style={styles.facts}>
                {formatLongDate(event.startDate) ? (
                  <View style={styles.fact}>
                    <Ionicons name="calendar-clear-outline" size={14} color="rgba(255,255,255,0.7)" />
                    <Text variant="small" style={styles.factText}>
                      {[formatLongDate(event.startDate), event.startTime?.trim()]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                ) : null}
                {venue ? (
                  <View style={styles.fact}>
                    <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
                    <Text variant="small" style={styles.factText} numberOfLines={1}>
                      {venue}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {event.description ? (
              <View style={styles.block}>
                {/* Invisible twin — measures the full line count so "Read
                    more" only appears when something is actually cut off.
                    The clipping wrapper is load-bearing: `position: absolute`
                    keeps the twin out of the layout flow but *not* out of the
                    scroll container's overflow, so an unwrapped twin adds its
                    whole unclamped height to the scrollable range and leaves a
                    dead screenful under the last block. */}
                <View style={styles.descriptionMeasure} pointerEvents="none" aria-hidden>
                  <Text
                    variant="body"
                    style={styles.description}
                    onTextLayout={(e) => setDescLines(e.nativeEvent.lines.length)}>
                    {event.description}
                  </Text>
                </View>
                <Text
                  variant="body"
                  style={styles.description}
                  numberOfLines={descExpanded ? undefined : DESC_PREVIEW_LINES}>
                  {event.description}
                </Text>
                {descOverflows ? (
                  <ExpandToggle
                    label={descExpanded ? 'Show less' : 'Read more'}
                    icon={descExpanded ? 'chevron-up' : 'chevron-down'}
                    onPress={() => setDescExpanded((value) => !value)}
                  />
                ) : null}
              </View>
            ) : null}

            {event.tags?.length ? (
              <View style={[styles.block, styles.tagRow]}>
                {event.tags.map((tag) => (
                  <Chip key={tag} label={tag} variant="glass" />
                ))}
              </View>
            ) : null}

            {organizer ? (
              <View style={styles.block}>
                <View style={[styles.hostCard, { borderColor: theme.glassBorder }]}>
                  <View style={styles.hostAvatar}>
                    <Text variant="callout" style={styles.hostInitial}>
                      {organizer.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.hostText}>
                    <Text variant="caption" style={styles.hostLabel}>
                      Hosted by
                    </Text>
                    <Text variant="callout" style={styles.hostName} numberOfLines={1}>
                      {organizer}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {gallery.length ? (
              <View style={styles.section}>
                <SectionHeader title="Gallery" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rail}>
                  {gallery.map((image) => (
                    <View key={image.uri} style={styles.galleryItem}>
                      <Image
                        source={{ uri: image.uri }}
                        style={styles.galleryImage}
                        contentFit="cover"
                        transition={180}
                        cachePolicy="memory-disk"
                      />
                      {image.caption ? (
                        <Text variant="caption" style={styles.galleryCaption} numberOfLines={2}>
                          {image.caption}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

          </>
        ) : null}
      </ScrollView>

      {/* Floating chrome, over the scroll: back on the left, the two things you
          can do to an event that aren't buying it on the right. */}
      <View style={[styles.header, { top: insets.top + Spacing.sm }]}>
        <GlassButton
          label="Back"
          icon="chevron-back"
          accessibilityLabel="Go back"
          onPress={goBack}
          blurTarget={backdropRef}
        />
        <View style={styles.headerActions}>
          <GlassIconButton
            icon={saved ? 'heart' : 'heart-outline'}
            accessibilityLabel={saved ? 'Remove from saved' : 'Save event'}
            accessibilityState={{ selected: saved }}
            color={saved ? '#FB7185' : '#FFFFFF'}
            haptic
            onPress={() => setSaved((value) => !value)}
            blurTarget={backdropRef}
          />
          <GlassIconButton
            icon="share-outline"
            accessibilityLabel="Share this event"
            onPress={onShare}
            blurTarget={backdropRef}
          />
        </View>
      </View>

      {/* The only solid-white element on the screen — everything above is
          transparent or dimmed, so the action reads instantly. */}
      {event && tiers.length > 0 ? (
        <View style={[styles.buyBar, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Button
            label={soldOut ? 'Sold out' : 'Buy Now'}
            disabled={soldOut}
            size="lg"
            style={styles.buyButton}
            onPress={openSheet}
          />
        </View>
      ) : null}

      {event ? (
        <CheckoutSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          event={event}
        />
      ) : null}

      {/* Sits under the chrome (zIndex) so Back stays reachable on a slow
          connection, but over everything else until the reveal. */}
      {!ready ? (
        <Animated.View
          exiting={FadeOut.duration(220)}
          style={[styles.loadingOverlay, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { justifyContent: 'center' },
  backdrop: { opacity: 0.6 },

  header: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 20,
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },

  scrollContent: { gap: Spacing.xl },
  block: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  section: { gap: Spacing.md },
  rail: { paddingHorizontal: Spacing.lg, gap: Spacing.md },

  posterBlock: { paddingHorizontal: Spacing.lg },
  poster: {
    width: '100%',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    // Dark artwork otherwise dissolves into the page and the card loses its edge.
    borderWidth: StyleSheet.hairlineWidth,
  },

  title: { color: '#FFFFFF', lineHeight: 38, letterSpacing: -0.8 },
  facts: { gap: 6 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  factText: { color: 'rgba(255,255,255,0.72)', flexShrink: 1 },

  description: { lineHeight: 23, color: 'rgba(255,255,255,0.72)' },
  descriptionMeasure: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  readMore: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  readMoreText: { color: '#FFFFFF', fontFamily: FontFamily.semibold },

  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  hostAvatar: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  hostInitial: { color: '#FFFFFF' },
  hostText: { flex: 1, gap: 1 },
  hostLabel: { color: 'rgba(255,255,255,0.55)' },
  hostName: { color: '#FFFFFF' },

  galleryItem: { width: GALLERY_CARD_WIDTH, gap: Spacing.sm },
  galleryImage: {
    width: GALLERY_CARD_WIDTH,
    height: GALLERY_CARD_WIDTH / AspectRatio.banner,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  galleryCaption: { color: 'rgba(255,255,255,0.72)' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },

  buyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.lg },
  buyButton: { width: '100%' },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
