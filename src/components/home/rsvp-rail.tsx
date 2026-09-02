import { memo, useCallback } from 'react';
import { FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';

import { RsvpCard } from '@/components/rsvp/rsvp-card';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import type { RsvpForm } from '@/types/api';

const CARD_WIDTH = 280;
const GAP = Spacing.md;

const getItemLayout = (_: unknown, index: number) => ({
  length: CARD_WIDTH + GAP,
  offset: (CARD_WIDTH + GAP) * index,
  index,
});

const keyExtractor = (form: RsvpForm) => form._id;

/** Same shape as `EventRail` — this is the in-app discovery surface for RSVP forms, since none is tied to an event page. */
function RsvpRailImpl({ forms, loading }: { forms?: RsvpForm[]; loading?: boolean }) {
  const renderItem = useCallback<ListRenderItem<RsvpForm>>(
    ({ item }) => <RsvpCard form={item} layout="rail" />,
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

  if (!forms?.length) return null;

  return (
    <FlatList
      horizontal
      data={forms}
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

export const RsvpRail = memo(RsvpRailImpl);
