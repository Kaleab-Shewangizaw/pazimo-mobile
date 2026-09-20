import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
      style={[
        styles.card,
        { backgroundColor: sent ? 'rgba(255,255,255,0.08)' : theme.surfaceMuted, borderColor: theme.hairline },
      ]}>
      {image ? (
        <Image source={{ uri: image }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.imageFallback, { backgroundColor: theme.background }]}>
          <Ionicons name={KIND_ICON[kind]} size={20} color={theme.textMuted} />
        </View>
      )}
      <View style={styles.text}>
        <Text variant="body" numberOfLines={1}>
          {title ?? 'Loading…'}
        </Text>
        <Text variant="caption" color="brand">
          {KIND_CTA[kind]}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
    </Touchable>
  );
}

const IMAGE_SIZE = 48;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.sm,
  },
  image: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: Radius.md },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
