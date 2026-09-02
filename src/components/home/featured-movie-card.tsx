import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { GlassChip } from '@/components/ui/glass-button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveImageUrl } from '@/lib/media';
import { dayKeyOf, movieChips } from '@/lib/programme';
import type { CinemaMovie } from '@/types/api';

export type FeaturedMovieCardProps = {
  movie: CinemaMovie;
  /** `rail` is the fixed-width horizontal variant, matching `EventCard`/`RsvpCard`. */
  layout?: 'feed' | 'rail';
};

/**
 * A featured film, dressed like `EventCard`/`RsvpCard`'s rail variant — same
 * geometry and card language — since it now rides the Activities rail
 * alongside them, not a rail of its own.
 *
 * Tapping opens the film's own page directly (never the Cinema tab's
 * cinema-picker), pre-scoped via `cinemaId`/`date` to the cinema and day it's
 * actually showing at next — the same two params `PosterDeck`'s own tap
 * already carries from the cinema screen (`cinema.tsx`'s `onOpen`). "Featured"
 * already means "what's on soon," so there is nothing left to choose but a time.
 */
function FeaturedMovieCardImpl({ movie, layout = 'rail' }: FeaturedMovieCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const cover = resolveImageUrl(movie.coverImage ?? movie.poster);
  const compact = layout === 'rail';
  const chips = movieChips(movie).join(' · ');

  const onPress = useCallback(() => {
    router.push({
      pathname: '/movie/[id]',
      params: {
        id: movie._id,
        cinemaId: movie.cinema?._id ?? '',
        date: movie.nextShowtime ? dayKeyOf(movie.nextShowtime) : '',
      },
    });
  }, [movie._id, movie.cinema?._id, movie.nextShowtime, router]);

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${movie.title}${chips ? `. ${chips}` : ''}`}
      onPress={onPress}
      style={[styles.card, compact ? styles.rail : styles.feed, { borderColor: theme.hairline }]}>
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          recyclingKey={movie._id}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surfaceMuted }]} />
      )}

      <View style={styles.topRow}>
        <GlassChip label="Movie" />
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.5, 1]}
        style={styles.panel}
        pointerEvents="none"
      />

      <View style={[styles.body, compact && styles.bodyCompact]}>
        <Text variant="heading" numberOfLines={2} style={styles.title}>
          {movie.title}
        </Text>
        {chips ? (
          <View style={styles.infoRow}>
            <Ionicons name="film" size={compact ? 12 : 13} color="#FFFFFF" />
            <Text variant="small" numberOfLines={1} style={styles.infoText}>
              {chips}
            </Text>
          </View>
        ) : null}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  feed: { width: '100%', aspectRatio: AspectRatio.poster },
  rail: { width: 280, aspectRatio: AspectRatio.poster },

  topRow: { position: 'absolute', top: Spacing.md, left: Spacing.md, zIndex: 2 },

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
  title: {
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
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

export const FeaturedMovieCard = memo(FeaturedMovieCardImpl);
