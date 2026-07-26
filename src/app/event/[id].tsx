import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { TicketSheet } from '@/components/event/ticket-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Touchable } from '@/components/ui/pressable';
import { ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { useTheme } from '@/hooks/use-theme';
import { formatLongDate } from '@/lib/date';
import { eventCoverUrl } from '@/lib/media';
import { organizerDisplayName } from '@/lib/organizer';
import { availableCurrencies, isSoldOut } from '@/lib/pricing';
import { useEvent } from '@/queries/events';
import type { Currency } from '@/types/api';

const SCREEN_HEIGHT = Dimensions.get('window').height;

/** Preview lines before the description clamps behind "Read more". */
const DESC_PREVIEW_LINES = 4;

const GLOW = 'rgba(0,0,0,0.55)';

/**
 * Soft dark vignette bleeding in from every screen edge — frames the photo
 * and pulls the eye inward. Sits above the scrim gradient.
 */
function EdgeGlow() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[GLOW, 'transparent']} style={styles.glowTop} />
      <LinearGradient colors={['transparent', GLOW]} style={styles.glowBottom} />
      <LinearGradient
        colors={[GLOW, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.glowLeft}
      />
      <LinearGradient
        colors={['transparent', GLOW]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.glowRight}
      />
    </View>
  );
}

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
    <Touchable accessibilityRole="button" onPress={onPress} style={styles.readMore}>
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
  const router = useRouter();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();

  const scrollRef = useRef<ScrollView>(null);
  const { data: event, isLoading, isError, error, refetch } = useEvent(id);
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sheetVisible, setSheetVisible] = useState(false);
  // UI-only for now — there is no favorites endpoint yet, so the heart does
  // not survive leaving the screen.
  const [saved, setSaved] = useState(false);
  const [coverReady, setCoverReady] = useState(false);
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

  const currencies = useMemo(
    () => (event ? availableCurrencies(event) : (['ETB'] as Currency[])),
    [event],
  );
  const activeCurrency = currency ?? currencies[0];

  const tiers = event?.ticketTypes ?? [];
  const soldOut = event ? isSoldOut(event) : false;

  const cover = eventCoverUrl(event?.coverImages);
  const organizer = event ? organizerDisplayName(event) : null;

  const venue = [event?.location?.address, event?.location?.city]
    .filter(Boolean)
    .join(', ');

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
    <View style={styles.screen}>
      {/* Fixed backdrop — the photo stays put behind the whole scroll, like a
          wallpaper, rather than scrolling away with the hero. */}
      <View style={StyleSheet.absoluteFill}>
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            // No fade of its own — the loading overlay owns the reveal, so the
            // photo, scrims, and glow all land in the same frame.
            transition={0}
            priority="high"
            cachePolicy="memory-disk"
            onLoad={() => setCoverReady(true)}
            // A broken URL must not strand the spinner; reveal the fallback.
            onError={() => setCoverReady(true)}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surfaceMuted }]} />
        )}
        {/* Text now lives at both ends of the screen, so the scrim is darkest
            top and bottom and eases off across the middle where the photo
            should breathe. The dark ends double as the contrast floor for
            near-white covers. */}
        <LinearGradient
          colors={[
            'rgba(2,2,3,0.80)',
            'rgba(2,2,3,0.38)',
            'rgba(2,2,3,0.30)',
            'rgba(2,2,3,0.60)',
            'rgba(2,2,3,0.96)',
          ]}
          locations={[0, 0.3, 0.45, 0.64, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <EdgeGlow />
        {/* Reading mode — an expanded description needs quiet behind it, so
            the wallpaper recedes while it's open. */}
        {descExpanded ? (
          <Animated.View
            entering={FadeIn.duration(180)}
            style={[StyleSheet.absoluteFill, styles.readingScrim]}
            pointerEvents="none"
          />
        ) : null}
      </View>

      {/* Chrome — plain icons, no glass circles: the darkened scrim ends give
          them contrast, and the reference look is unboxed. */}
      <View style={[styles.chrome, { top: insets.top + Spacing.sm }]}>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          pressedScale={0.85}
          style={styles.chromeHit}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Touchable>

        <View style={styles.chromeRight}>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from saved' : 'Save event'}
            accessibilityState={{ selected: saved }}
            haptic
            onPress={() => setSaved((value) => !value)}
            pressedScale={0.85}
            style={styles.chromeHit}>
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={23} color="#FFFFFF" />
          </Touchable>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Share this event"
            onPress={() => {
              if (event) {
                Share.share({ message: `${event.title} — on Pazimo` }).catch(() => {
                  // User dismissed the sheet; nothing to recover from.
                });
              }
            }}
            pressedScale={0.85}
            style={styles.chromeHit}>
            <Ionicons name="share-outline" size={22} color="#FFFFFF" />
          </Touchable>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        // Collapsed, everything fits one screen like a poster — scrolling only
        // unlocks when "Read more" opens the full description.
        scrollEnabled={descExpanded}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 56,
            paddingBottom: insets.bottom + 120,
            minHeight: SCREEN_HEIGHT,
          },
        ]}>
        {event ? (
          <>
            {/* Identity — centered at the top like a poster masthead. */}
            <View style={styles.topBlock}>
              <Text variant="heading" role="heading" style={styles.title}>
                {event.title}
              </Text>
              <View style={styles.factsRow}>
                {formatLongDate(event.startDate) ? (
                  <View style={styles.fact}>
                    <Ionicons name="calendar-clear-outline" size={13} color="#FFFFFF" />
                    <Text variant="small" style={styles.factText}>
                      {formatLongDate(event.startDate)}
                    </Text>
                  </View>
                ) : null}
                {venue ? (
                  <View style={styles.fact}>
                    <Ionicons name="location-outline" size={14} color="#FFFFFF" />
                    <Text variant="small" style={styles.factText} numberOfLines={1}>
                      {venue}
                    </Text>
                  </View>
                ) : null}
                {event.ageRestriction?.hasRestriction && event.ageRestriction.minAge ? (
                  <View style={styles.fact}>
                    <Text variant="small" style={styles.factText}>
                      {event.ageRestriction.minAge}+
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Narrative — host, story, tags, stacked over the bottom scrim. */}
            <View style={styles.bottomBlock}>
              {organizer ? (
                <View style={styles.hostBlock}>
                  <View style={styles.hostAvatar}>
                    <Text variant="callout" style={styles.hostInitial}>
                      {organizer.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text variant="callout" style={styles.hostedBy}>
                    Hosted by {organizer}
                  </Text>
                </View>
              ) : null}

              {event.description ? (
                <View style={styles.descriptionBlock}>
                  {/* Invisible twin — measures the full line count so "Read
                      more" only appears when something is actually cut off. */}
                  <Text
                    variant="body"
                    style={[styles.description, styles.descriptionMeasure]}
                    aria-hidden
                    onTextLayout={(e) => setDescLines(e.nativeEvent.lines.length)}>
                    {event.description}
                  </Text>
                  <Text
                    variant="body"
                    style={styles.description}
                    numberOfLines={descExpanded ? undefined : DESC_PREVIEW_LINES}>
                    {event.description}
                  </Text>
                  {descOverflows && !descExpanded ? (
                    <ExpandToggle label="Read more" icon="chevron-down" onPress={() => setDescExpanded(true)} />
                  ) : null}
                </View>
              ) : null}

              {/* Tags trail the toggle when collapsed and precede it when
                  expanded, so they stay visible in both states. */}
              {event.tags?.length ? (
                <View style={styles.tagRow}>
                  {event.tags.map((tag) => (
                    <Chip key={tag} label={tag} variant="glass" />
                  ))}
                </View>
              ) : null}

              {event.description && descOverflows && descExpanded ? (
                <ExpandToggle
                  label="Show less"
                  icon="chevron-up"
                  onPress={() => {
                    setDescExpanded(false);
                    // Snap (not glide) back to the top so collapsing restores
                    // the exact poster layout in one frame.
                    scrollRef.current?.scrollTo({ y: 0, animated: false });
                  }}
                />
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* The only solid-white element on the screen — everything above is
          transparent or dimmed, so the action reads instantly. */}
      {event && tiers.length > 0 ? (
        <View style={[styles.buyBar, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Button
            label={soldOut ? 'Sold out' : 'Buy Now'}
            disabled={soldOut}
            size="lg"
            style={styles.buyButton}
            onPress={() => setSheetVisible(true)}
          />
        </View>
      ) : null}

      {event ? (
        <TicketSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
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
          onContinue={() => {
            setSheetVisible(false);
            router.push(
              `/checkout/${event._id}?tier=${selectedTierId}&currency=${activeCurrency}&qty=${quantity}`,
            );
          }}
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
  chrome: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chromeRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  chromeHit: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },
  glowBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 130 },
  glowLeft: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 48 },
  glowRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 48 },
  readingScrim: { backgroundColor: 'rgba(2,2,3,0.55)' },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    gap: Spacing.xl,
  },
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
  topBlock: { alignItems: 'center', gap: Spacing.md },
  title: { color: '#FFFFFF', textAlign: 'center' },
  factsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: Spacing.lg,
    rowGap: Spacing.xs,
  },
  fact: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexShrink: 1 },
  factText: { color: 'rgba(255,255,255,0.9)', flexShrink: 1 },
  bottomBlock: { alignItems: 'center', gap: Spacing.lg },
  hostBlock: { alignItems: 'center', gap: Spacing.sm },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  hostInitial: { color: '#FFFFFF' },
  hostedBy: { color: '#FFFFFF' },
  descriptionBlock: { alignItems: 'center', alignSelf: 'stretch', gap: Spacing.xs },
  description: { textAlign: 'center', lineHeight: 22, color: 'rgba(255,255,255,0.82)' },
  descriptionMeasure: { position: 'absolute', left: 0, right: 0, opacity: 0 },
  readMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.30)',
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginTop: Spacing.xs,
  },
  readMoreText: { color: '#FFFFFF', fontFamily: FontFamily.semibold },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  buyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.lg },
  buyButton: { width: '100%' },
});
