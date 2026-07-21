import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import {
  Dimensions,
  FlatList,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';

import { Glass } from '@/components/ui/glass';
import { Touchable } from '@/components/ui/pressable';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/date';
import { eventCoverUrl } from '@/lib/media';
import type { PazimoEvent } from '@/types/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SLIDE_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const SLIDE_HEIGHT = SLIDE_WIDTH / AspectRatio.banner;
const STRIDE = SLIDE_WIDTH + Spacing.md;

const keyExtractor = (event: PazimoEvent) => event._id;

const getItemLayout = (_: unknown, index: number) => ({
  length: STRIDE,
  offset: STRIDE * index,
  index,
});

function BannerCarouselImpl({ events, loading }: { events?: PazimoEvent[]; loading?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const [active, setActive] = useState(0);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActive(Math.round(e.nativeEvent.contentOffset.x / STRIDE));
  }, []);

  const renderItem = useCallback<ListRenderItem<PazimoEvent>>(
    ({ item }) => {
      const cover = eventCoverUrl(item.coverImages);
      return (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={item.title}
          onPress={() => router.push(`/event/${item.shortId ?? item._id}`)}
          style={styles.slide}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              recyclingKey={item._id}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surfaceMuted }]} />
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.78)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Glass is affordable here — one slide is on screen at a time. */}
          <Glass variant="clear" intensity={28} radius={Radius.md} style={styles.caption}>
            <Text variant="callout" numberOfLines={1} style={styles.captionText}>
              {item.title}
            </Text>
            <Text variant="caption" numberOfLines={1} style={styles.captionMeta}>
              {formatDateTime(item.startDate, item.startTime)}
            </Text>
          </Glass>
        </Touchable>
      );
    },
    [router, theme.surfaceMuted],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Skeleton width={SLIDE_WIDTH} height={SLIDE_HEIGHT} radius={Radius.xl} />
      </View>
    );
  }

  if (!events?.length) return null;

  return (
    <View>
      <FlatList
        horizontal
        data={events}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        snapToInterval={STRIDE}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={32}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
      />

      {events.length > 1 ? (
        <View style={styles.dots}>
          {events.map((event, index) => (
            <View
              key={event._id}
              style={[
                styles.dot,
                {
                  backgroundColor: index === active ? theme.brand : theme.hairline,
                  width: index === active ? 18 : 6,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  slide: {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  caption: {
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  captionText: { color: '#FFFFFF' },
  captionMeta: { color: 'rgba(255,255,255,0.82)' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  dot: { height: 6, borderRadius: Radius.pill },
});

export const BannerCarousel = memo(BannerCarouselImpl);
