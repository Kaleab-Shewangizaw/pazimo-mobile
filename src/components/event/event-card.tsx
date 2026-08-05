import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { GlassChip, GlassIconButton } from '@/components/ui/glass-button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/date';
import { eventCoverUrl } from '@/lib/media';
import { formatPrice, isSoldOut, lowestPrice } from '@/lib/pricing';
import type { Currency, PazimoEvent } from '@/types/api';

/**
 * Android's stock BlurView only tints (no real blur) without this renderer.
 * Passed to the progressive-blur panel below.
 */
const androidBlurMethod = Platform.OS === 'android' ? 'dimezisBlurView' : 'none';

/** Cross-fade rather than a flash of empty box when art arrives from cache. */
const IMAGE_TRANSITION = 180;

export type EventCardProps = {
  event: PazimoEvent;
  currency?: Currency;
  /** `rail` is the fixed-width horizontal variant; `feed` fills the column. */
  layout?: 'feed' | 'rail';
};

/**
 * Real blur is confined to the two small controls, which use the shared glass
 * recipe from `ui/glass-button` — the same material as the detail page's Back
 * button, so a chip reads identically wherever it lands.
 *
 * It is deliberately *not* used for the bottom scrim: blurring a large area of
 * artwork only smears the photo's own colours around, which reads as muddy, and
 * a BlurView's hard boundary shows as a crease across the card. A gradient does
 * that job cleanly and for free.
 *
 * Note the controls still bend the app's "no BlurView in a list row" rule (see
 * `ui/glass.tsx`). It stays affordable because rails mount few cards at
 * once — `initialNumToRender=3`, `windowSize=5`, `removeClippedSubviews` — and
 * because they pass no `blurTarget`, so Android tints rather than sampling.
 */
function EventCardImpl({ event, currency = 'ETB', layout = 'feed' }: EventCardProps) {
  const theme = useTheme();
  const router = useRouter();
  // UI-only for now — there is no favorites endpoint yet, so this does not
  // survive leaving the screen (same caveat as the detail page's heart).
  const [saved, setSaved] = useState(false);

  const cover = eventCoverUrl(event.coverImages);
  const soldOut = isSoldOut(event);
  const price = lowestPrice(event, currency);
  const priceText = price === 0 ? 'Free' : price !== null ? formatPrice(price, currency) : null;
  const venue = [event.location?.address, event.location?.city].filter(Boolean).join(', ');
  const compact = layout === 'rail';

  const onPress = useCallback(() => {
    // shortId keeps the URL tidy and hits the cheaper public lookup.
    router.push(`/event/${event.shortId ?? event._id}`);
  }, [event._id, event.shortId, router]);

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}. ${formatDateTime(event.startDate, event.startTime)}`}
      onPress={onPress}
      style={[styles.card, compact ? styles.rail : styles.feed, { borderColor: theme.hairline }]}>
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={IMAGE_TRANSITION}
          cachePolicy="memory-disk"
          recyclingKey={event._id}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surfaceMuted }]} />
      )}

      <View style={styles.topRow}>
        <GlassChip
          label={soldOut ? 'Sold out' : (priceText ?? '')}
          style={styles.priceChip}
        />

        <GlassIconButton
          icon="heart"
          accessibilityLabel={saved ? 'Remove from saved' : 'Save event'}
          accessibilityState={{ selected: saved }}
          color={saved ? '#E11D48' : '#FFFFFF'}
          size={36}
          haptic
          onPress={() => setSaved((value) => !value)}
        />
      </View>

      {/*
        Progressive blur: the BlurView is masked by a gradient so the blur
        itself ramps up from nothing instead of switching on at a hard edge.
        That is what keeps it seamless — fading only the colour leaves the
        *sharpness* stepping, which is the crease.
      */}
      <MaskedView
        style={styles.panel}
        pointerEvents="none"
        maskElement={
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.4)', '#000000']}
            locations={[0, 0.45, 0.85]}
            style={StyleSheet.absoluteFill}
          />
        }>
        <BlurView
          intensity={30}
          tint="dark"
          experimentalBlurMethod={androidBlurMethod}
          style={StyleSheet.absoluteFill}
        />
      </MaskedView>

      {/*
        The designer's glow from the Figma export, lightened. Theirs ramps
        cream -> #33140A; this keeps the cream shoulder but lands on a warm
        smoke rather than that brown, so the panel reads white-ish. The alpha
        still climbs slowly, standing in for the 200px blur's falloff.
      */}
      <LinearGradient
        colors={[
          'rgba(255,252,250,0)',
          'rgba(45, 44, 43, 0.18)',
          'rgba(37, 36, 35, 0.4)',
          'rgba(6, 6, 6, 0.6)',
          'rgba(16, 15, 14, 0.76)',
          'rgba(0, 0, 0, 0.86)',
        ]}
        locations={[0, 0.2, 0.42, 0.65, 0.85, 1]}
        style={styles.panel}
        pointerEvents="none"
      />

      <View style={[styles.body, compact && styles.bodyCompact]}>
        <Text variant="heading" numberOfLines={2} style={styles.title}>
          {event.title}
        </Text>

        <View style={styles.infoRows}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-clear" size={compact ? 12 : 13} color="#FFFFFF" />
            <Text variant="small" numberOfLines={1} style={styles.infoText}>
              {formatDateTime(event.startDate, event.startTime)}
            </Text>
          </View>
          {venue ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-sharp" size={compact ? 12 : 13} color="#FFFFFF" />
              <Text variant="small" numberOfLines={1} style={styles.infoText}>
                {venue}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  feed: { width: '100%', aspectRatio: AspectRatio.poster },
  rail: { width: 280, aspectRatio: AspectRatio.poster },

  topRow: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceChip: { maxWidth: '62%' },

  /** 54% ≈ the Figma blob's top edge (453 of 981) relative to the frame. */
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '54%' },
  body: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  bodyCompact: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.xs },
  // Tight leading and negative tracking, matching the Figma type ramp
  // (leading 91.7 on 122.2 ≈ 0.75; tracking -9.77 ≈ -8% of size).
  title: {
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  infoRows: { gap: 5, alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  infoText: {
    color: '#FFFFFF',
    flexShrink: 1,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});

export const EventCard = memo(EventCardImpl);
