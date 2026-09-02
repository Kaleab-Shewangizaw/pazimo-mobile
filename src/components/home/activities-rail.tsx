import { memo, useCallback } from 'react';
import { FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';

import { EventCard } from '@/components/event/event-card';
import { FeaturedMovieCard } from '@/components/home/featured-movie-card';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import type { CinemaMovie, PazimoEvent } from '@/types/api';

const CARD_WIDTH = 280;
const GAP = Spacing.md;

const getItemLayout = (_: unknown, index: number) => ({
  length: CARD_WIDTH + GAP,
  offset: (CARD_WIDTH + GAP) * index,
  index,
});

export type ActivityItem =
  | { kind: 'event'; event: PazimoEvent }
  | { kind: 'movie'; movie: CinemaMovie };

const keyExtractor = (item: ActivityItem) =>
  item.kind === 'event' ? item.event._id : item.movie._id;

/**
 * A featured cinema movie is an activity too, so it rides the same row as the
 * category-matched activity events rather than a rail of its own.
 */
function ActivitiesRailImpl({ items, loading }: { items?: ActivityItem[]; loading?: boolean }) {
  const renderItem = useCallback<ListRenderItem<ActivityItem>>(
    ({ item }) =>
      item.kind === 'event' ? (
        <EventCard event={item.event} layout="rail" />
      ) : (
        <FeaturedMovieCard movie={item.movie} layout="rail" />
      ),
    [],
  );

  if (loading) {
    return (
      <View style={styles.skeletonRow}>
        {[0, 1].map((i) => (
          <Skeleton
            key={i}
            width={CARD_WIDTH}
            height={CARD_WIDTH / AspectRatio.poster}
            radius={Radius.xl}
          />
        ))}
      </View>
    );
  }

  if (!items?.length) return null;

  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      snapToInterval={CARD_WIDTH + GAP}
      decelerationRate="fast"
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      windowSize={5}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: GAP },
  skeletonRow: { flexDirection: 'row', gap: GAP, paddingHorizontal: Spacing.lg },
});

export const ActivitiesRail = memo(ActivitiesRailImpl);
