import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Skeleton } from '@/components/ui/skeleton';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { eventCoverUrl } from '@/lib/media';
import type { PazimoEvent } from '@/types/api';

const THUMB = 72;
const GAP = Spacing.md;

const keyExtractor = (event: PazimoEvent) => event._id;

/** A lighter-weight glance strip beneath the main browse rail — thumbnail only. */
function UpcomingRailImpl({ events, loading }: { events?: PazimoEvent[]; loading?: boolean }) {
  const theme = useTheme();
  const router = useRouter();

  const renderItem = useCallback<ListRenderItem<PazimoEvent>>(
    ({ item }) => {
      const cover = eventCoverUrl(item.coverImages);
      return (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={item.title}
          onPress={() => router.push(`/event/${item.shortId ?? item._id}`)}
          pressedScale={0.94}
          style={styles.thumbWrap}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View style={[styles.thumb, { backgroundColor: theme.surfaceMuted }]} />
          )}
        </Touchable>
      );
    },
    [router, theme.surfaceMuted],
  );

  if (loading) {
    return (
      <View style={styles.skeletonRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={THUMB} height={THUMB} radius={Radius.lg} />
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
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      initialNumToRender={6}
      windowSize={3}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: GAP },
  skeletonRow: { flexDirection: 'row', gap: GAP, paddingHorizontal: Spacing.lg },
  thumbWrap: { borderRadius: Radius.lg, overflow: 'hidden' },
  thumb: { width: THUMB, height: THUMB },
});

export const UpcomingRail = memo(UpcomingRailImpl);
