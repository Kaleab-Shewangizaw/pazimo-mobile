import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { AspectRatio, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/date';
import type { InviteKind } from '@/lib/invite-link';
import { eventCoverUrl, resolveImageUrl } from '@/lib/media';
import { useVenueBeverageCatalog } from '@/queries/beverages';
import { useCinemaMovie } from '@/queries/cinema';
import { useEvent } from '@/queries/events';

export type InviteMessageCardProps = {
  kind: InviteKind;
  id: string;
  openShowtimes?: boolean;
  /** Which side of the thread this bubble sits on — only affects tint, same convention as the transfer bubbles in `share-row.tsx`. */
  sent: boolean;
};

const KIND_ICON: Record<InviteKind, keyof typeof Ionicons.glyphMap> = {
  movie: 'film',
  event: 'calendar',
  venue: 'location',
};

const KIND_LABEL: Record<InviteKind, string> = {
  movie: 'Movie',
  event: 'Event',
  venue: 'Venue',
};

const KIND_CTA: Record<InviteKind, string> = {
  movie: 'Pick a showtime',
  event: 'View event',
  venue: 'View venue',
};

/**
 * The rich-card rendering of an invite `MESSAGE` whose text is a deep link
 * (see `lib/invite-link.ts`). Fetches the movie/event/venue client-side by
 * id — no new endpoints — and always renders tappable immediately, showing
 * "Loading…" for the title rather than waiting on the fetch to resolve
 * before becoming interactive.
 *
 * The artwork fills the whole card, edge to edge — the event's cover or the
 * movie's poster at the same ratio the feed's event cards use — with the
 * title and CTA laid over a scrim at the bottom. A venue has no artwork, so
 * it gets a gradient with its icon in the same frame.
 */
export function InviteMessageCard({ kind, id, openShowtimes, sent }: InviteMessageCardProps) {
  const theme = useTheme();
  const router = useRouter();

  const movieQuery = useCinemaMovie(kind === 'movie' ? id : undefined);
  const eventQuery = useEvent(kind === 'event' ? id : undefined);
  const venueQuery = useVenueBeverageCatalog(kind === 'venue' ? id : undefined);

  const title =
    kind === 'movie'
      ? movieQuery.page?.movie.title
      : kind === 'event'
        ? eventQuery.data?.title
        : venueQuery.venue?.name;

  // A refill venue's catalog fetch carries no image field at all — that's
  // the only kind of the three with no card artwork available client-side.
  const image =
    kind === 'movie'
      ? resolveImageUrl(movieQuery.page?.movie.poster)
      : kind === 'event'
        ? eventCoverUrl(eventQuery.data?.coverImages)
        : null;

  const subtitle =
    kind === 'event' && eventQuery.data
      ? formatDateTime(eventQuery.data.startDate, eventQuery.data.startTime)
      : null;

  const onPress = () => {
    if (kind === 'movie') {
      router.push({
        pathname: '/movie/[id]',
        params: openShowtimes ? { id, openShowtimes: '1' } : { id },
      });
    } else if (kind === 'event') {
      router.push(`/event/${id}`);
    } else {
      router.push(`/refill/venue/${id}`);
    }
  };

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={title ? `Open ${title}` : 'Open shared item'}
      onPress={onPress}
      pressedScale={0.98}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
      {image ? (
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        <LinearGradient
          colors={[sent ? theme.surfaceMuted : theme.surface, theme.backgroundElevated]}
          style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Ionicons name={KIND_ICON[kind]} size={48} color={theme.textMuted} />
        </LinearGradient>
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.kindChip, { backgroundColor: theme.glassStrong }]}>
        <Ionicons name={KIND_ICON[kind]} size={12} color={theme.text} />
        <Text variant="label" style={styles.kindLabel}>
          {KIND_LABEL[kind].toUpperCase()}
        </Text>
      </View>

      <View style={styles.overlay}>
        <Text variant="title" numberOfLines={2} style={styles.title}>
          {title ?? 'Loading…'}
        </Text>
        {subtitle ? (
          <Text variant="small" numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
        <View style={[styles.cta, { backgroundColor: theme.brand }]}>
          <Text variant="small" style={[styles.ctaText, { color: theme.onBrand }]}>
            {KIND_CTA[kind]}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={theme.onBrand} />
        </View>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: AspectRatio.poster,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  kindChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    margin: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  kindLabel: { fontSize: 10 },
  overlay: { padding: Spacing.md, gap: 4 },
  title: { color: '#FFFFFF' },
  subtitle: { color: 'rgba(255,255,255,0.8)' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  ctaText: { fontFamily: FontFamily.bold },
});
