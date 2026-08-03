import { memo, useCallback } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';

import { EventCard } from '@/components/event/event-card';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import type { PazimoEvent } from '@/types/api';

const CARD_WIDTH = 280;
const GAP = Spacing.md;

/** Fixed geometry lets the list skip measurement entirely while scrolling. */
const getItemLayout = (_: unknown, index: number) => ({
  length: CARD_WIDTH + GAP,
  offset: (CARD_WIDTH + GAP) * index,
  index,
});

const keyExtractor = (event: PazimoEvent) => event._id;

function EventRailImpl({
  events,
  loading,
  onEndReached,
  loadingMore,
}: {
  events?: PazimoEvent[];
  loading?: boolean;
  /** Wired to the horizontal scroll, not the page — this rail is now often the primary list. */
  onEndReached?: () => void;
  loadingMore?: boolean;
}) {
  const renderItem = useCallback<ListRenderItem<PazimoEvent>>(
    ({ item }) => <EventCard event={item} layout="rail" />,
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

  if (!events?.length) return null;

  return (
    <FlatList
      horizontal
      data={events}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      snapToInterval={CARD_WIDTH + GAP}
      decelerationRate="fast"
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} /> : null}
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
  footer: { width: 40 },
});

export const EventRail = memo(EventRailImpl);
