import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { AspectRatio, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateBadge, formatLongDate } from '@/lib/date';
import { eventCoverUrl } from '@/lib/media';
import { isSoldOut, priceLabel } from '@/lib/pricing';
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
 * Poster card — a miniature of the event detail masthead: venue eyebrow and
 * title over the photo's bottom scrim, date chip up top, so tapping through
 * feels like the poster simply grows.
 */
function EventCardImpl({ event, currency = 'ETB', layout = 'feed' }: EventCardProps) {
  const theme = useTheme();
  const router = useRouter();

  const cover = eventCoverUrl(event.coverImages);
  const soldOut = isSoldOut(event);
  const price = priceLabel(event, currency);
  const badge = formatDateBadge(event.startDate);
  const eyebrow = (event.location?.city ?? event.location?.address)?.toUpperCase();

  const onPress = useCallback(() => {
    // shortId keeps the URL tidy and hits the cheaper public lookup.
    router.push(`/event/${event.shortId ?? event._id}`);
  }, [event._id, event.shortId, router]);

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}. ${formatLongDate(event.startDate) ?? ''}`}
      onPress={onPress}
      style={[
        styles.card,
        layout === 'rail' ? styles.rail : styles.feed,
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

      {/* Same scrim ramp as the detail screen — heavy only where type sits. */}
      <LinearGradient
        colors={['transparent', 'rgba(2,2,3,0.42)', 'rgba(2,2,3,0.90)']}
        locations={[0, 0.35, 1]}
        style={styles.bottomScrim}
        pointerEvents="none"
      />
      {/* Light top scrim so the date chip reads over bright artwork. */}
      <LinearGradient
        colors={['rgba(2,2,3,0.35)', 'transparent']}
        style={styles.topScrim}
        pointerEvents="none"
      />

      {badge ? (
        <View style={[styles.dateBadge, { backgroundColor: theme.glassStrong }]}>
          <Text variant="label" style={styles.badgeMonth}>
            {badge.month}
          </Text>
          <Text variant="callout" style={styles.badgeDay}>
            {badge.day}
          </Text>
        </View>
      ) : null}

      {soldOut ? (
        <View style={[styles.statusPill, { backgroundColor: theme.scrim }]}>
          <Text variant="label" style={styles.badgeText}>
            SOLD OUT
          </Text>
        </View>
      ) : null}

      <View style={styles.body}>
        {eyebrow ? (
          <Text variant="label" numberOfLines={1} style={styles.eyebrow}>
            {eyebrow}
          </Text>
        ) : null}
        <View style={styles.titleRow}>
          <Text
            variant={layout === 'rail' ? 'title' : 'heading'}
            numberOfLines={2}
            style={styles.title}>
            {event.title}
          </Text>
          {price ? (
            <View style={styles.priceChip}>
              <Text variant="caption" style={styles.priceText}>
                {price}
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
  feed: { width: '100%', aspectRatio: AspectRatio.hero },
  rail: { width: 240, aspectRatio: AspectRatio.banner },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '62%' },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 72 },
  dateBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    minWidth: 44,
  },
  badgeMonth: { color: 'rgba(255,255,255,0.75)' },
  badgeDay: { color: '#FFFFFF' },
  statusPill: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
  },
  badgeText: { color: '#FFFFFF' },
  body: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  eyebrow: { color: 'rgba(255,255,255,0.70)', letterSpacing: 1.1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  title: { color: '#FFFFFF', flexShrink: 1 },
  priceChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.30)',
    marginBottom: 2,
  },
  priceText: { color: '#FFFFFF', fontFamily: FontFamily.semibold },
});

export const EventCard = memo(EventCardImpl);
