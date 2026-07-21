import { Ionicons } from '@expo/vector-icons';
import { useRouter, useScrollToTop } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { EventCard } from '@/components/event/event-card';
import { BannerCarousel } from '@/components/home/banner-carousel';
import { CategoryRail } from '@/components/home/category-rail';
import { EventRail } from '@/components/home/event-rail';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { Touchable } from '@/components/ui/pressable';
import { SectionHeader } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state-views';
import { tabBarClearance } from '@/constants/layout';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCategories } from '@/queries/categories';
import {
  useBannerEvents,
  useEventFeed,
  useFeaturedEvents,
  useTrendingEvents,
} from '@/queries/events';
import type { PazimoEvent } from '@/types/api';

const keyExtractor = (event: PazimoEvent) => event._id;

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const listRef = useRef<FlatList<PazimoEvent>>(null);
  // Tapping the active tab returns to the top of the feed.
  useScrollToTop(listRef);

  const banner = useBannerEvents();
  const categories = useCategories();
  const featured = useFeaturedEvents();
  const trending = useTrendingEvents();
  const feed = useEventFeed();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      banner.refetch(),
      categories.refetch(),
      featured.refetch(),
      trending.refetch(),
      feed.refetch(),
    ]);
    setRefreshing(false);
  }, [banner, categories, featured, trending, feed]);

  const onEndReached = useCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) {
      feed.fetchNextPage();
    }
  }, [feed]);

  const renderItem = useCallback<ListRenderItem<PazimoEvent>>(
    ({ item }) => (
      <View style={styles.feedItem}>
        <EventCard event={item} />
      </View>
    ),
    [],
  );

  const header = (
    <View style={styles.headerBlock}>
      <BannerCarousel events={banner.data} loading={banner.isLoading} />

      <View style={styles.section}>
        <CategoryRail categories={categories.data} loading={categories.isLoading} />
      </View>

      {featured.isLoading || featured.data?.length ? (
        <View style={styles.section}>
          <SectionHeader title="Featured" />
          <EventRail events={featured.data} loading={featured.isLoading} />
        </View>
      ) : null}

      {trending.isLoading || trending.data?.length ? (
        <View style={styles.section}>
          <SectionHeader title="Trending" />
          <EventRail events={trending.data} loading={trending.isLoading} />
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="All events" />
      </View>
    </View>
  );

  const footer = feed.isFetchingNextPage ? (
    <ActivityIndicator style={styles.footer} color={theme.brand} />
  ) : null;

  const empty = feed.isLoading ? (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <Skeleton height={180} radius={Radius.lg} />
          <Skeleton width="70%" height={16} />
          <Skeleton width="45%" height={12} />
        </View>
      ))}
    </View>
  ) : feed.isError ? (
    <ErrorState
      message={feed.error instanceof ApiError ? feed.error.message : undefined}
      onRetry={() => feed.refetch()}
    />
  ) : null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <GlassHeader
        title="Pazimo"
        showLogo
        right={
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Search events"
            onPress={() => router.push('/discover')}
            pressedScale={0.92}
            style={[styles.headerButton, { backgroundColor: theme.brandTint }]}>
            <Ionicons name="search" size={19} color={theme.brand} />
          </Touchable>
        }
      />

      <FlatList
        ref={listRef}
        data={feed.data ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={empty}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.lg,
          paddingBottom: tabBarClearance(insets.bottom),
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.brand}
            progressViewOffset={insets.top + HEADER_CONTENT_HEIGHT}
          />
        }
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBlock: { gap: Spacing.xl, paddingBottom: Spacing.md },
  section: { gap: 0 },
  feedItem: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  footer: { paddingVertical: Spacing.xl },
  skeletonList: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },
  skeletonCard: { gap: Spacing.sm },
});
