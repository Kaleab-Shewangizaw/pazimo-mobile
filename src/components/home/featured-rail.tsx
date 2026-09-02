import { memo, useCallback } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';

import { EventCard } from '@/components/event/event-card';
import { RsvpCard } from '@/components/rsvp/rsvp-card';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import type { PazimoEvent, RsvpForm } from '@/types/api';

const CARD_WIDTH = 280;
const GAP = Spacing.md;

const getItemLayout = (_: unknown, index: number) => ({
  length: CARD_WIDTH + GAP,
  offset: (CARD_WIDTH + GAP) * index,
  index,
});

export type FeaturedItem = { kind: 'event'; event: PazimoEvent } | { kind: 'rsvp'; form: RsvpForm };

const keyExtractor = (item: FeaturedItem) =>
  item.kind === 'event' ? item.event._id : item.form._id;

/**
 * `EventRail`'s Featured-shelf sibling, widened to also carry featured RSVP
 * forms. An RSVP form has no category to filter by, so it only ever shows up
 * here — a category-filtered shelf keeps using plain `EventRail`.
 */
function FeaturedRailImpl({
  items,
  loading,
  onEndReached,
  loadingMore,
}: {
  items?: FeaturedItem[];
  loading?: boolean;
  /** Wired to the horizontal scroll — only events paginate; RSVP items carry no such affordance. */
  onEndReached?: () => void;
  loadingMore?: boolean;
}) {
  const renderItem = useCallback<ListRenderItem<FeaturedItem>>(
    ({ item }) =>
      item.kind === 'event' ? (
        <EventCard event={item.event} layout="rail" />
      ) : (
        <RsvpCard form={item.form} layout="rail" />
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

export const FeaturedRail = memo(FeaturedRailImpl);
