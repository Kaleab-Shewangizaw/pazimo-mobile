import { useCallback } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventCard } from '@/components/event/event-card';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useWishlist } from '@/queries/events';
import type { PazimoEvent } from '@/types/api';

/** Adding happens from the heart on an event card/detail page — this screen only lists and removes. */
export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const { events, isLoading, isError, error, refetch } = useWishlist();
  const { refreshing, onRefresh } = useRefresh(refetch);

  const renderItem = useCallback<ListRenderItem<PazimoEvent>>(
    ({ item }) => (
      <View style={styles.item}>
        <EventCard event={item} />
      </View>
    ),
    [],
  );

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.lg;

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Wishlist" left={<HeaderBackButton />} />

      {isLoading && events.length === 0 ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(event) => event._id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: topPadding,
            paddingBottom: tabBarClearance(insets.bottom),
          }}
          refreshControl={
            <PageRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              progressViewOffset={topPadding}
            />
          }
          ListEmptyComponent={
            isError ? (
              <ErrorState message={error?.message} onRetry={() => refetch()} />
            ) : (
              <EmptyState
                icon="heart-outline"
                title="Nothing saved yet"
                message="Tap the heart on an event to save it here."
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  item: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
});
