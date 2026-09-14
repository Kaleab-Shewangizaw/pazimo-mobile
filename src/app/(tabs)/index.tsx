import { Ionicons } from '@expo/vector-icons';
import { useRouter, useScrollToTop } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { CategoryRail } from '@/components/home/category-rail';
import { CategoryTabs } from '@/components/home/category-tabs';
import { EventRail } from '@/components/home/event-rail';
import { FeaturedRail, type FeaturedItem } from '@/components/home/featured-rail';
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
import { isSoldOut } from '@/lib/pricing';
import { useCategories } from '@/queries/categories';
import { categoryIdOf } from '@/queries/discover';
import { useEventFeed } from '@/queries/events';
import { useRsvpFeed } from '@/queries/rsvp';
import { useTicketShares } from '@/queries/ticket-shares';

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
  const rsvp = useRsvpFeed();
  // Query itself no-ops for a guest — no session, nothing to poll.
  const { shares: incomingShares } = useTicketShares({ direction: 'received', status: 'pending' });

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

  // The Featured shelf blends in featured RSVP forms too — they have no
  // category to filter by, so they only ever appear in this unfiltered case.
  // Events keep their existing order and lead the shelf; the admin-featured
  // RSVP forms are appended after, same order the web app's own blended feed
  // uses (`featuredEvents.concat(featuredRsvps)`).
  const featuredItems = useMemo<FeaturedItem[]>(
    () => [
      ...filteredEvents.map((event) => ({ kind: 'event', event }) as const),
      ...rsvp.forms.filter((form) => form.isFeatured).map((form) => ({ kind: 'rsvp', form }) as const),
    ],
    [filteredEvents, rsvp.forms],
  );

  // Everything else: events and RSVP forms, one row's worth, with "Show all"
  // handing off to the full Discover list. Not-featured-and-not-sold-out
  // items lead the row; featured or sold-out ones only fill the remaining
  // slots if there isn't enough else to show. Movies don't belong here.
  const MORE_COUNT = 7;
  const moreItems = useMemo<FeaturedItem[]>(() => {
    const events = feed.data ?? [];
    const forms = rsvp.forms;

    const leadEvents = events.filter((event) => !event.isFeatured && !isSoldOut(event));
    const restEvents = events.filter((event) => event.isFeatured || isSoldOut(event));
    const leadForms = forms.filter((form) => !form.isFeatured);
    const restForms = forms.filter((form) => form.isFeatured);

    const lead = [
      ...leadEvents.map((event) => ({ kind: 'event', event }) as const),
      ...leadForms.map((form) => ({ kind: 'rsvp', form }) as const),
    ];
    const rest = [
      ...restEvents.map((event) => ({ kind: 'event', event }) as const),
      ...restForms.map((form) => ({ kind: 'rsvp', form }) as const),
    ];

    return [...lead, ...rest].slice(0, MORE_COUNT);
  }, [feed.data, rsvp.forms]);

  const { refreshing, onRefresh } = useRefresh(categories.refetch, feed.refetch, rsvp.refetch);

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
            <View>
              <GlassIconButton
                icon="chatbubble-outline"
                accessibilityLabel={
                  incomingShares.length ? 'Chats, new tickets waiting' : 'Chats'
                }
                blurTarget={backdropRef}
                onPress={() => router.push('/shares')}
              />
              {incomingShares.length ? (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.danger, borderColor: theme.background },
                  ]}
                  pointerEvents="none"
                />
              ) : null}
            </View>
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
        ) : activeCategory === null ? (
          featuredItems.length ? (
            <FeaturedRail
              items={featuredItems}
              onEndReached={onEndReached}
              loadingMore={feed.isFetchingNextPage}
            />
          ) : (
            <View style={styles.stateBlock}>
              <EmptyState
                icon="calendar-outline"
                title="No events here"
                message="Nothing is featured right now — try a category."
              />
            </View>
          )
        ) : filteredEvents.length ? (
          <EventRail
            events={filteredEvents}
            onEndReached={onEndReached}
            loadingMore={feed.isFetchingNextPage}
          />
        ) : (
          <View style={styles.stateBlock}>
            <EmptyState icon="calendar-outline" title="No events here" message="Try a different category." />
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

        {feed.isLoading || rsvp.isLoading || moreItems.length ? (
          <View style={styles.section}>
            <SectionHeader
              title="More to explore"
              actionLabel="Show all"
              onAction={() => router.push('/discover')}
            />
            <FeaturedRail items={moreItems} loading={feed.isLoading || rsvp.isLoading} />
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
