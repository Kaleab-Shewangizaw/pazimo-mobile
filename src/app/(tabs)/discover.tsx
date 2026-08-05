import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useDeferredValue, useRef, useState } from 'react';
import {
  FlatList,
  type ListRenderItem,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { FilterSheet } from '@/components/discover/filter-sheet';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { EventCard } from '@/components/event/event-card';
import { Glass } from '@/components/ui/glass';
import { GLASS_TINT, GlassIconButton } from '@/components/ui/glass-button';
import { Touchable } from '@/components/ui/pressable';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Radius, Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { useCategories } from '@/queries/categories';
import { DEFAULT_FILTERS, activeFilterCount, useDiscover } from '@/queries/discover';
import type { PazimoEvent } from '@/types/api';

const keyExtractor = (event: PazimoEvent) => event._id;

/**
 * The floating search row, measured from its own paddings: `sm` top, a 42pt
 * search bar, `sm` bottom. The list pads itself past this and the refresh
 * spinner drops just below it.
 */
const HEADER_BLOCK_HEIGHT = 58;

/**
 * The field sits on glass now, not on an opaque fill, so its own furniture has
 * to be white-on-dark like every other glass control rather than the muted grey
 * that only worked against `surfaceMuted`.
 */
const PLACEHOLDER = 'rgba(255,255,255,0.55)';

export default function DiscoverScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();

  // What the floating controls sample on Android — the static ambient backdrop.
  const backdropRef = useRef<View>(null);

  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    categoryId: params.category ?? null,
  });

  // This is a tab screen, so it stays mounted once visited and the state
  // initialiser above only ever sees the *first* category param. Without this
  // re-sync, arriving from the home category grid a second time navigates here
  // but leaves the previous filter applied. Adjusting state during render (not
  // in an effect) is React's documented pattern for this, and avoids the
  // `set-state-in-effect` rule this project lints for.
  const [lastCategoryParam, setLastCategoryParam] = useState(params.category);
  if (params.category !== lastCategoryParam) {
    setLastCategoryParam(params.category);
    setFilters((current) => ({ ...current, categoryId: params.category ?? null }));
  }

  // Keeps typing smooth: the list re-filters at a lower priority than the input.
  const deferredQuery = useDeferredValue(query);

  const categories = useCategories();
  const { results, isLoading, isError, error, refetch } = useDiscover({
    ...filters,
    query: deferredQuery,
  });
  const activeCount = activeFilterCount(filters);

  const renderItem = useCallback<ListRenderItem<PazimoEvent>>(
    ({ item }) => (
      <View style={styles.item}>
        <EventCard event={item} />
      </View>
    ),
    [],
  );

  // The catalogue is one bounded fetch, so a pull re-pulls the whole thing —
  // filtering and search run over it client-side and need no refetch of their own.
  const { refreshing, onRefresh } = useRefresh(refetch, categories.refetch);

  return (
    <View style={styles.screen}>
      <AmbientBackground blurTarget={backdropRef} />
      {/* Bare, not a frosted bar. A glass control nested inside glass blurs the
          bar rather than the page and flattens into a grey disc — the chips and
          the field below only read as glass because nothing sits behind them. */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Glass
          variant="clear"
          intensity={28}
          tint={GLASS_TINT}
          radius={Radius.pill}
          blurTarget={backdropRef}
          style={styles.searchBar}>
          <Ionicons name="search" size={18} color={PLACEHOLDER} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search events, venues, cities"
            placeholderTextColor={PLACEHOLDER}
            style={styles.input}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {query.length > 0 ? (
            <Touchable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
              pressedScale={0.9}>
              <Ionicons name="close-circle" size={18} color={PLACEHOLDER} />
            </Touchable>
          ) : null}
        </Glass>

        {/* The badge is what replaces the chip row's visibility: with the
            controls behind a sheet, this is the only thing telling you a filter
            is narrowing the results. */}
        <View>
          <GlassIconButton
            icon="options-outline"
            accessibilityLabel={
              activeCount ? `Filters, ${activeCount} applied` : 'Filters'
            }
            size={42}
            onPress={() => setFiltersOpen(true)}
            blurTarget={backdropRef}
          />
          {activeCount > 0 ? (
            <View
              style={[
                styles.filterBadge,
                { backgroundColor: theme.brand, borderColor: theme.background },
              ]}
              pointerEvents="none">
              <Text variant="caption" style={{ color: theme.onBrand }}>
                {activeCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        categories={categories.data}
        filters={filters}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        resultCount={results.length}
      />

      <FlatList
        data={results}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingTop: insets.top + HEADER_BLOCK_HEIGHT + Spacing.lg,
          paddingBottom: tabBarClearance(insets.bottom),
        }}
        refreshControl={
          <PageRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={insets.top + HEADER_BLOCK_HEIGHT}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonList}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={220} radius={Radius.lg} />
              ))}
            </View>
          ) : isError ? (
            <ErrorState
              message={error instanceof ApiError ? error.message : undefined}
              onRetry={() => refetch()}
            />
          ) : (
            <EmptyState
              icon="search-outline"
              title="No events found"
              message={
                query
                  ? `Nothing matches "${query}". Try a different search.`
                  : activeCount
                    ? // The filters live behind a sheet now, so an empty list has
                      // to say why — otherwise it reads as "the app has nothing".
                      'No events match these filters. Try widening them.'
                    : 'There are no published events to show yet.'
              }
            />
          )
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
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 42,
  },
  input: { flex: 1, fontSize: 15, padding: 0, color: '#FFFFFF' },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // The ring is what separates the badge from the glass behind it.
    borderWidth: 1.5,
  },
  item: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  skeletonList: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
});
