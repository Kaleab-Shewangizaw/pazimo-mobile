import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveImageUrl } from '@/lib/media';
import { movieChips } from '@/lib/programme';
import type { CinemaMovie } from '@/types/api';

/**
 * A film in a search result grid — the poster with title and the two facts
 * (runtime, rating, genre) that don't read off the art itself, same idea as
 * the cinema-picker and ticket rows but tall and paired for a browsing grid
 * rather than a single wide row.
 */

export type MovieResultCardProps = {
  movie: CinemaMovie;
};

function MovieResultCardImpl({ movie }: MovieResultCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const poster = resolveImageUrl(movie.poster);
  const chips = movieChips(movie).join(' · ');

  const onPress = useCallback(() => {
    router.push({ pathname: '/movie/[id]', params: { id: movie._id } });
  }, [movie._id, router]);

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={movie.title}
      onPress={onPress}
      pressedScale={0.97}
      style={[styles.card, { borderColor: theme.hairline }]}>
      {poster ? (
        <Image
          source={{ uri: poster }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          recyclingKey={movie._id}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surfaceMuted }]} />
      )}

      <LinearGradient
        colors={['transparent', 'rgba(6,6,8,0.55)', 'rgba(6,6,8,0.95)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.body}>
        <Text variant="callout" style={styles.title} numberOfLines={2}>
          {movie.title}
        </Text>
        {chips ? (
          <Text variant="caption" style={styles.chips} numberOfLines={1}>
            {chips}
          </Text>
        ) : null}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 2 / 3,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  body: { padding: Spacing.md, gap: 2 },
  title: { color: '#FFFFFF', letterSpacing: -0.3 },
  chips: { color: 'rgba(255,255,255,0.72)' },
});

export const MovieResultCard = memo(MovieResultCardImpl);
