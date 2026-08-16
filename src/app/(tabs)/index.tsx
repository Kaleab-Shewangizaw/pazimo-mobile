import { Ionicons } from '@expo/vector-icons';
import { useRouter, useScrollToTop } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { CategoryRail } from '@/components/home/category-rail';
import { CategoryTabs } from '@/components/home/category-tabs';
import { EventRail } from '@/components/home/event-rail';
// Parked with the "Upcoming" block below.
// import { UpcomingRail } from '@/components/home/upcoming-rail';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassIconButton } from '@/components/ui/glass-button';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { Touchable } from '@/components/ui/pressable';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { SectionHeader } from '@/components/ui/section';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Radius, Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { useActivityEvents } from '@/queries/activities';
import { useCategories } from '@/queries/categories';
import { categoryIdOf } from '@/queries/discover';
import { useEventFeed } from '@/queries/events';

/** Small glance strip under the main rail — the first page's worth is plenty. */
// const UPCOMING_COUNT = 10;

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  // Tapping the active tab returns to the top of the page.
  useScrollToTop(scrollRef);

  // What the header's glass controls sample on Android — the ambient backdrop,
  // which is static and therefore cheap to blur against.
  const backdropRef = useRef<View>(null);

  const categories = useCategories();
  const feed = useEventFeed();
  const activities = useActivityEvents();

  // The API has no category *or* featured filter on any event route, so both
  // run client-side over whatever pages have been fetched so far — same stopgap
  // `useDiscover` already relies on.
  //
  // `activeCategory === null` is the Featured shelf, not "unfiltered": there is
  // no tab that shows the whole feed any more.
  const filteredEvents = useMemo(() => {
    const events = feed.data ?? [];
    return activeCategory
      ? events.filter((event) => categoryIdOf(event) === activeCategory)
      : events.filter((event) => event.isFeatured);
  }, [feed.data, activeCategory]);
  // const upcoming = (feed.data ?? []).slice(0, UPCOMING_COUNT);

  // Activities ride the same two caches, so refetching them covers the whole page.
  const { refreshing, onRefresh } = useRefresh(categories.refetch, feed.refetch);

  const onEndReached = useCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) {
      feed.fetchNextPage();
    }
  }, [feed]);

  return (
    <View style={styles.screen}>
      <AmbientBackground blurTarget={backdropRef} />
      {/* No material of its own — the page reads as one continuous surface, and
          the glass controls below blur the backdrop rather than the bar. */}
      <GlassHeader
        title="Pazimo"
        showLogo
        blurred={false}
        right={
          <View style={styles.headerActions}>
            <View>
              <GlassIconButton
                icon="notifications-outline"
                accessibilityLabel="Notifications"
                blurTarget={backdropRef}
                // Presentational for now — there is no notifications route or
                // feed yet, so this has nowhere to go (same caveat as the
                // save hearts).
                onPress={() => {}}
              />
              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.danger, borderColor: theme.background },
                ]}
                pointerEvents="none"
              />
            </View>
            {/* A glyph, not a photo: the app is guest-first and there is no
                auth phase yet, so there is no avatar to show. */}
            <GlassIconButton
              icon="person"
              accessibilityLabel="Your profile"
              blurTarget={backdropRef}
              onPress={() => router.push('/profile')}
            />
          </View>
        }
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.xxl,
            paddingBottom: tabBarClearance(insets.bottom),
          },
        ]}
        refreshControl={
          <PageRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={insets.top + HEADER_CONTENT_HEIGHT}
          />
        }>
        <View style={styles.hero}>
          <Text variant="display" style={styles.heroTitle}>
            Choose{'\n'}Today&rsquo;s Event
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
              message={
                activeCategory
                  ? 'Try a different category.'
                  : 'Nothing is featured right now — try a category.'
              }
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
            <CategoryRail categories={categories.data} loading={categories.isLoading} />
          </View>
        ) : null}

        {activities.isLoading || activities.events.length ? (
          <View style={styles.section}>
            <SectionHeader title="Activities" />
            <EventRail events={activities.events} loading={activities.isLoading} />
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
    width: 45,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  section: { gap: Spacing.md },
  stateBlock: { paddingHorizontal: Spacing.lg },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
    // The ring is what separates the dot from the bell behind it.
    borderWidth: 1.5,
  },
});
