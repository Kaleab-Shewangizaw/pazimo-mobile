import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useDeferredValue, useState } from 'react';
import {
  FlatList,
  type ListRenderItem,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { EventCard } from '@/components/event/event-card';
import { Glass } from '@/components/ui/glass';
import { Touchable } from '@/components/ui/pressable';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCategories } from '@/queries/categories';
import { type SortOption, useDiscover } from '@/queries/discover';
import type { PazimoEvent } from '@/types/api';

const TAB_BAR_CLEARANCE = 56;

const keyExtractor = (event: PazimoEvent) => event._id;

export default function DiscoverScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(params.category ?? null);
  const [sort, setSort] = useState<SortOption>('newest');

  // Keeps typing smooth: the list re-filters at a lower priority than the input.
  const deferredQuery = useDeferredValue(query);

  const categories = useCategories();
  const { results, isLoading, isError, error, refetch } = useDiscover({
    query: deferredQuery,
    categoryId,
    sort,
  });

  const renderItem = useCallback<ListRenderItem<PazimoEvent>>(
    ({ item }) => (
      <View style={styles.item}>
        <EventCard event={item} />
      </View>
    ),
    [],
  );

  const toggleCategory = useCallback((id: string) => {
    setCategoryId((current) => (current === id ? null : id));
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Glass
        variant="regular"
        intensity={60}
        radius={0}
        bordered={false}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search events, venues, cities"
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { color: theme.text }]}
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
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </Touchable>
          ) : null}
        </View>

        <FlatList
          horizontal
          data={categories.data ?? []}
          keyExtractor={(item) => item._id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => {
            const active = item._id === categoryId;
            return (
              <Touchable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => toggleCategory(item._id)}
                pressedScale={0.95}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.brand : theme.surfaceMuted,
                    borderColor: active ? theme.brand : theme.hairline,
                  },
                ]}>
                <Text
                  variant="caption"
                  style={{ color: active ? theme.onBrand : theme.textSecondary }}>
                  {item.name}
                </Text>
              </Touchable>
            );
          }}
          ListFooterComponent={
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${sort === 'newest' ? 'soonest' : 'newest'}`}
              onPress={() => setSort((s) => (s === 'newest' ? 'soonest' : 'newest'))}
              pressedScale={0.95}
              style={[styles.chip, styles.sortChip, { borderColor: theme.hairline }]}>
              <Ionicons name="swap-vertical" size={13} color={theme.brand} />
              <Text variant="caption" color="brand">
                {sort === 'newest' ? 'Newest' : 'Soonest'}
              </Text>
            </Touchable>
          }
        />
      </Glass>

      <FlatList
        data={results}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingTop: insets.top + 116,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + Spacing.xl,
        }}
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
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    height: 42,
    borderRadius: Radius.pill,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  chipRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: Spacing.sm },
  item: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  skeletonList: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
});
