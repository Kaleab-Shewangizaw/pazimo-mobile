import { memo, useCallback } from 'react';
import { FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';

import { EventCard } from '@/components/event/event-card';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import type { PazimoEvent } from '@/types/api';

const CARD_WIDTH = 240;
const GAP = Spacing.md;

/** Fixed geometry lets the list skip measurement entirely while scrolling. */
const getItemLayout = (_: unknown, index: number) => ({
  length: CARD_WIDTH + GAP,
  offset: (CARD_WIDTH + GAP) * index,
  index,
});

const keyExtractor = (event: PazimoEvent) => event._id;

function EventRailImpl({ events, loading }: { events?: PazimoEvent[]; loading?: boolean }) {
  const renderItem = useCallback<ListRenderItem<PazimoEvent>>(
    ({ item }) => <EventCard event={item} layout="rail" />,
    [],
  );

  if (loading) {
    return (
      <View style={styles.skeletonRow}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <Skeleton width={CARD_WIDTH} height={CARD_WIDTH / AspectRatio.card} radius={Radius.lg} />
            <Skeleton width={CARD_WIDTH * 0.8} height={14} />
            <Skeleton width={CARD_WIDTH * 0.5} height={12} />
          </View>
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
  skeletonCard: { gap: Spacing.sm },
});

export const EventRail = memo(EventRailImpl);
