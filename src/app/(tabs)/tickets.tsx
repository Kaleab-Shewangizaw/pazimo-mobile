import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TicketPoster, posterHostStyle } from '@/components/ticket/ticket-poster';
import { TicketStub } from '@/components/ticket/ticket-stub';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTicketDownloadQueue } from '@/hooks/use-ticket-download';
import { useMyTickets, useTicketCovers } from '@/queries/tickets';
import type { Ticket } from '@/types/api';

/**
 * Every ticket this person holds, newest first.
 *
 * Deliberately uncategorised. Filters exist to cut a list down to something
 * findable, and nobody holds enough tickets for that to be the problem — the
 * event's own artwork on each row already makes the right one obvious, and a
 * chip rail here would just be furniture between the buyer and their QR code.
 */
export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { tickets, isLoading, isError, error, refetch } = useMyTickets();
  const covers = useTicketCovers(tickets);
  const { refreshing, onRefresh } = useRefresh(refetch);
  const { posterRef, pending, request, busyTicketId } = useTicketDownloadQueue();

  const renderItem = useCallback(
    ({ item }: { item: Ticket }) => (
      <TicketStub
        ticket={item}
        cover={covers[item.event._id]}
        onDownload={request}
        downloading={busyTicketId === item._id}
      />
    ),
    [request, busyTicketId, covers],
  );

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.lg;

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Tickets" />

      {isLoading && tickets.length === 0 ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(ticket) => ticket._id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingTop: topPadding, paddingBottom: tabBarClearance(insets.bottom) },
          ]}
          refreshControl={
            <PageRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              progressViewOffset={topPadding}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isError ? (
              <ErrorState message={error?.message} onRetry={() => refetch()} />
            ) : (
              <EmptyState
                icon="ticket-outline"
                title="No tickets yet"
                message="Tickets you buy show up here with their QR codes, ready to scan at the door."
                actionLabel="Find something to do"
                onAction={() => router.push('/(tabs)/discover')}
              />
            )
          }
        />
      )}

      {/* One poster slot for the whole list — see `useTicketDownloadQueue`. */}
      {pending ? (
        <View style={posterHostStyle} pointerEvents="none" aria-hidden>
          <TicketPoster ref={posterRef} ticket={pending} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
});
