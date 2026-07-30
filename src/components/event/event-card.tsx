import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { AspectRatio, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/date';
import { eventCoverUrl } from '@/lib/media';
import { formatPrice, isSoldOut, lowestPrice } from '@/lib/pricing';
import type { Currency, PazimoEvent } from '@/types/api';

/** Cross-fade rather than a flash of empty box when art arrives from cache. */
const IMAGE_TRANSITION = 180;

export type EventCardProps = {
  event: PazimoEvent;
  currency?: Currency;
  /** `rail` is the fixed-width horizontal variant; `feed` fills the column. */
  layout?: 'feed' | 'rail';
};

/**
 * The chip, heart button, and info panel all use a flat translucent tint, not
 * a real BlurView — `ui/glass.tsx` is explicit that a genuine blur pass inside
 * a scrolling list is the easiest way to make this app janky. The tint reads
 * as frosted glass without paying that cost; only fixed chrome (the tab bar,
 * the header) gets the real thing.
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
      style={[
        styles.card,
        compact ? styles.rail : styles.feed,
        { borderColor: theme.hairline },
      ]}>
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

      {/* Light top scrim keeps the chip and heart legible over bright skies. */}
      <LinearGradient
        colors={['rgba(2,2,3,0.30)', 'transparent']}
        style={styles.topScrim}
        pointerEvents="none"
      />

      <View style={styles.topRow}>
        <View style={[styles.glassChip, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
          <Text variant="caption" style={styles.priceChipText} numberOfLines={1}>
            {soldOut ? 'Sold out' : (priceText ?? '')}
          </Text>
        </View>

        <Touchable
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from saved' : 'Save event'}
          accessibilityState={{ selected: saved }}
          haptic
          onPress={() => setSaved((value) => !value)}
          pressedScale={0.88}
          style={[styles.heartButton, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={compact ? 15 : 17}
            color={saved ? '#E11D48' : '#FFFFFF'}
          />
        </Touchable>
      </View>

      {/* Text sits directly on the gradient — no boxed panel, no middle dark
          stop: a single fade from transparent at top to white at the very
          bottom. The title's own text shadow (not a dark backdrop) is what
          keeps it legible against the lighter fill. */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.68)']}
        style={styles.bottomScrim}
        pointerEvents="none"
      />

      <View style={[styles.body, compact && styles.bodyCompact]}>
        <Text
          variant={compact ? 'title' : 'heading'}
          numberOfLines={2}
          style={styles.title}>
          {event.title}
        </Text>

        <View style={styles.infoRows}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={compact ? 13 : 14} color="#FFFFFF" />
            <Text
              variant={compact ? 'small' : 'small'}
              numberOfLines={1}
              style={styles.infoText}>
              {formatDateTime(event.startDate, event.startTime)}
            </Text>
          </View>
          {venue ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-sharp" size={compact ? 13 : 14} color="#FFFFFF" />
              <Text
                variant={compact ? 'small' : 'small'}
                numberOfLines={1}
                style={styles.infoText}>
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
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  feed: { width: '100%', aspectRatio: 0.72 },
  rail: { width: 280, aspectRatio: AspectRatio.banner },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '58%' },
  topRow: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glassChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '62%',
  },
  priceChipText: { color: '#FFFFFF', fontFamily: FontFamily.bold },
  heartButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  bodyCompact: { padding: Spacing.md, gap: Spacing.xs },
  title: {
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  infoRows: { gap: 4, alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  infoText: {
    color: 'rgba(255,255,255,0.9)',
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export const EventCard = memo(EventCardImpl);
