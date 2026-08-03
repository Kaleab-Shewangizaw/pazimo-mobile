import { Ionicons } from '@expo/vector-icons';
import { useRouter, useScrollToTop } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { CategoryGrid } from '@/components/home/category-grid';
import { CategoryTabs } from '@/components/home/category-tabs';
import { EventRail } from '@/components/home/event-rail';
// Parked with the "Upcoming" block below.
// import { UpcomingRail } from '@/components/home/upcoming-rail';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { Touchable } from '@/components/ui/pressable';
import { SectionHeader } from '@/components/ui/section';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/queries/categories';
import { categoryIdOf } from '@/queries/discover';
import { useEventFeed } from '@/queries/events';

/** Small glance strip under the main rail — the first page's worth is plenty. */
// const UPCOMING_COUNT = 10;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  // Tapping the active tab returns to the top of the page.
  useScrollToTop(scrollRef);

  const categories = useCategories();
  const feed = useEventFeed();

  // The API has no category filter on any event route, so this runs
  // client-side over whatever pages have been fetched so far — same stopgap
  // `useDiscover` already relies on.
  const filteredEvents = useMemo(() => {
    const events = feed.data ?? [];
    return activeCategory ? events.filter((event) => categoryIdOf(event) === activeCategory) : events;
  }, [feed.data, activeCategory]);
  // const upcoming = (feed.data ?? []).slice(0, UPCOMING_COUNT);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([categories.refetch(), feed.refetch()]);
    setRefreshing(false);
  }, [categories, feed]);

  const onEndReached = useCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) {
      feed.fetchNextPage();
    }
  }, [feed]);

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Pazimo" showLogo />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.lg,
            paddingBottom: tabBarClearance(insets.bottom),
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            progressViewOffset={insets.top + HEADER_CONTENT_HEIGHT}
          />
        }>
        <View style={styles.hero}>
          <Text variant="display" style={styles.heroTitle}>
            Choose Today&rsquo;s{'\n'}Event
          </Text>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Search events"
            onPress={() => router.push('/discover')}
            pressedScale={0.92}
            style={styles.heroSearch}>
            <Ionicons name="search" size={22} color="#0A0A0B" />
          </Touchable>
        </View>

        <CategoryTabs
          categories={categories.data}
          activeId={activeCategory}
          onChange={setActiveCategory}
        />

        {feed.isLoading ? (
          <EventRail loading />
        ) : feed.isError ? (
          <View style={styles.stateBlock}>
            <ErrorState
              message={feed.error instanceof ApiError ? feed.error.message : undefined}
              onRetry={() => feed.refetch()}
            />
          </View>
        ) : filteredEvents.length ? (
          <EventRail
            events={filteredEvents}
            onEndReached={onEndReached}
            loadingMore={feed.isFetchingNextPage}
          />
        ) : (
          <View style={styles.stateBlock}>
            <EmptyState
              icon="calendar-outline"
              title="No events here"
              message="Try a different category."
            />
          </View>
        )}

        {/* Parked, not deleted — see `upcoming` / `UPCOMING_COUNT` above.
        {upcoming.length ? (
          <View style={styles.section}>
            <SectionHeader title="Upcoming" />
            <UpcomingRail events={upcoming} loading={feed.isLoading} />
          </View>
        ) : null}
        */}

        {categories.isLoading || categories.data?.length ? (
          <View style={styles.section}>
            <SectionHeader title="Browse by category" />
            <CategoryGrid categories={categories.data} loading={categories.isLoading} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { gap: Spacing.xl },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  heroTitle: { color: '#FFFFFF', flexShrink: 1 },
  heroSearch: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  section: { gap: Spacing.md },
  stateBlock: { paddingHorizontal: Spacing.lg },
});
