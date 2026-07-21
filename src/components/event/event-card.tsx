import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateBadge, formatDateTime } from '@/lib/date';
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

function EventCardImpl({ event, currency = 'ETB', layout = 'feed' }: EventCardProps) {
  const theme = useTheme();
  const router = useRouter();

  const cover = eventCoverUrl(event.coverImages);
  const badge = formatDateBadge(event.startDate);
  const soldOut = isSoldOut(event);
  const price = priceLabel(event, currency);
  const venue = event.location?.city ?? event.location?.address;

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
        layout === 'rail' ? styles.rail : styles.feed,
        { backgroundColor: theme.surface, borderColor: theme.hairline },
      ]}>
      <View style={styles.coverWrap}>
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={styles.cover}
            contentFit="cover"
            transition={IMAGE_TRANSITION}
            cachePolicy="memory-disk"
            recyclingKey={event._id}
          />
        ) : (
          <View style={[styles.cover, { backgroundColor: theme.surfaceMuted }]} />
        )}

        {/* Scrim keeps the date chip legible over bright or busy artwork. */}
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'transparent']}
          style={styles.topScrim}
          pointerEvents="none"
        />

        {badge ? (
          <View style={[styles.dateBadge, { backgroundColor: theme.glassStrong }]}>
            <Text variant="label" color="brand">
              {badge.month}
            </Text>
            <Text variant="callout">{badge.day}</Text>
          </View>
        ) : null}

        {soldOut ? (
          <View style={[styles.statusPill, { backgroundColor: theme.scrim }]}>
            <Text variant="caption" style={{ color: '#FFFFFF' }}>
              Sold out
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text variant="callout" numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={theme.textMuted} />
          <Text variant="small" color="textSecondary" numberOfLines={1} style={styles.metaText}>
            {formatDateTime(event.startDate, event.startTime)}
          </Text>
        </View>

        {venue ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={theme.textMuted} />
            <Text variant="small" color="textSecondary" numberOfLines={1} style={styles.metaText}>
              {venue}
            </Text>
          </View>
        ) : null}

        {price ? (
          <Text variant="small" color="brand" style={styles.price}>
            {price}
          </Text>
        ) : null}
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
  feed: { width: '100%' },
  rail: { width: 240 },
  coverWrap: { width: '100%', aspectRatio: AspectRatio.card },
  cover: { width: '100%', height: '100%' },
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
  statusPill: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  body: { padding: Spacing.md, gap: Spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  metaText: { flex: 1 },
  price: { marginTop: Spacing.xs, fontWeight: '700' },
});

export const EventCard = memo(EventCardImpl);
