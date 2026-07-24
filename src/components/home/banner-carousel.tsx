import { Ionicons } from '@expo/vector-icons';
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

import { Chip } from '@/components/ui/chip';
import { Touchable } from '@/components/ui/pressable';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { AspectRatio, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { relativeDayLabel } from '@/lib/date';
import { eventCoverUrl } from '@/lib/media';
import { organizerDisplayName } from '@/lib/organizer';
import type { PazimoEvent } from '@/types/api';

/**
 * A tall, editorial hero card — one event per screenful, swiped rather than
 * scanned. The gradient and type treatment are doing the work here, not a
 * glass panel, so text sits directly on the photo the way a poster would.
 */

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
      const whenLabel = relativeDayLabel(item.startDate, item.startTime);
      const categoryLabel = typeof item.category === 'object' ? item.category?.name : null;
      const organizer = organizerDisplayName(item);

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

          {/* Weighted toward the bottom so the whole caption block stays legible. */}
          <LinearGradient
            colors={['transparent', 'rgba(3,3,4,0.35)', 'rgba(2,2,3,0.94)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={styles.caption} pointerEvents="box-none">
            {whenLabel || categoryLabel ? (
              <View style={styles.chipRow}>
                {whenLabel ? <Chip label={whenLabel} variant="solid" /> : null}
                {categoryLabel ? <Chip label={categoryLabel.toUpperCase()} variant="glass" /> : null}
              </View>
            ) : null}

            <Text numberOfLines={2} style={styles.title}>
              {item.title}
            </Text>

            <View style={styles.footerRow}>
              {organizer ? (
                <View style={styles.organizerRow}>
                  <View style={[styles.avatar, { borderColor: theme.brand }]}>
                    <Text variant="caption" style={[styles.avatarInitial, { color: theme.brand }]}>
                      {organizer.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text variant="small" numberOfLines={1} style={styles.organizerName}>
                    {organizer}
                  </Text>
                </View>
              ) : (
                <View />
              )}

              <View style={styles.arrowButton}>
                <Ionicons
                  name="arrow-up"
                  size={15}
                  color="#0A0A0B"
                  style={styles.arrowIcon}
                />
              </View>
            </View>
          </View>
        </Touchable>
      );
    },
    [router, theme.brand, theme.surfaceMuted],
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
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  chipRow: { flexDirection: 'row', gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  title: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 32,
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    gap: Spacing.md,
  },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  avatar: {
    width: 27,
    height: 27,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarInitial: { fontWeight: '700' },
  organizerName: { color: 'rgba(255,255,255,0.88)', flexShrink: 1 },
  arrowButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(245,245,247,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: { transform: [{ rotate: '45deg' }] },
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
