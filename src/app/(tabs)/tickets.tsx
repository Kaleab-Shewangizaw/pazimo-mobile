import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CinemaOrderStub } from '@/components/ticket/cinema-order-stub';
import { TicketPoster, posterHostStyle } from '@/components/ticket/ticket-poster';
import { TicketStub } from '@/components/ticket/ticket-stub';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { Touchable } from '@/components/ui/pressable';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Radius, Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTicketDownloadQueue } from '@/hooks/use-ticket-download';
import { useMyCinemaOrders } from '@/queries/cinema-orders';
import { type TicketGroup, useTicketGroups } from '@/queries/tickets';
import { useTicketShares } from '@/queries/ticket-shares';
import type { CinemaOrder } from '@/types/api';

/**
 * Every event this person holds tickets to, newest first — plus, on its own
 * tab, every cinema order.
 *
 * One row per event, not per ticket. Buying twice for the same night is two
 * admissions with two QR codes, but it is still one thing on your calendar —
 * listing it twice makes the list look like a ledger instead of a wallet. The
 * admissions live behind the row, swipeable once it's open.
 *
 * Cinema gets its own tab rather than folding into the same feed: an order is
 * a different shape end to end (an order screen, not a swipeable pager;
 * QR-per-seat inside one card; snacks bought alongside) and the two ticket
 * kinds don't share an id space to sort by. Within each tab it stays
 * deliberately uncategorised, the same reasoning as before — the event's own
 * artwork already makes the right row obvious, and a chip rail here would
 * just be furniture between the buyer and their QR code.
 */

type TicketsTab = 'events' | 'cinema';

const TABS: { key: TicketsTab; label: string }[] = [
  { key: 'events', label: 'Events' },
  { key: 'cinema', label: 'Cinema' },
];

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [tab, setTab] = useState<TicketsTab>('events');

  const { groups, isLoading, isError, error, refetch } = useTicketGroups();
  const { posterRef, pending, request, busyTicketId } = useTicketDownloadQueue();

  const { shares: pendingOutgoing } = useTicketShares({ direction: 'sent', status: 'pending' });
  const pendingTicketIds = useMemo(
    () => new Set(pendingOutgoing.flatMap((share) => share.items.map((item) => item.ticket._id))),
    [pendingOutgoing],
  );

  const {
    orders,
    isLoading: ordersLoading,
    isError: ordersError,
    error: ordersFetchError,
    refetch: refetchOrders,
  } = useMyCinemaOrders();

  const { refreshing, onRefresh } = useRefresh(refetch, refetchOrders);

  const renderEventItem = useCallback(
    ({ item }: { item: TicketGroup }) => (
      <TicketStub
        group={item}
        onDownload={request}
        downloading={item.tickets.some((ticket) => ticket._id === busyTicketId)}
        pending={item.tickets.some((ticket) => pendingTicketIds.has(ticket._id))}
      />
    ),
    [request, busyTicketId, pendingTicketIds],
  );

  const renderMovieItem = useCallback(({ item }: { item: CinemaOrder }) => <CinemaOrderStub order={item} />, []);

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.lg;
  const showingEvents = tab === 'events';
  const loading = showingEvents ? isLoading && groups.length === 0 : ordersLoading && orders.length === 0;

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Tickets" />

      <View style={[styles.tabsRow, { paddingTop: topPadding }]}>
        {TABS.map((t) => (
          <Touchable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
            accessibilityLabel={t.label}
            onPress={() => setTab(t.key)}
            pressedScale={0.96}
            style={[styles.tabPill, tab === t.key && styles.tabPillActive]}>
            <Text variant="small" style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </Touchable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : showingEvents ? (
        <FlatList
          key="events"
          data={groups}
          keyExtractor={(group) => group.key}
          renderItem={renderEventItem}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance(insets.bottom) }]}
          refreshControl={<PageRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
      ) : (
        <FlatList
          key="cinema"
          data={orders}
          keyExtractor={(order) => order.transactionId}
          renderItem={renderMovieItem}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance(insets.bottom) }]}
          refreshControl={<PageRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            ordersError ? (
              <ErrorState message={ordersFetchError?.message} onRetry={() => refetchOrders()} />
            ) : (
              <EmptyState
                icon="film-outline"
                title="No movie tickets yet"
                message="Tickets you buy at the cinema — and any snacks that came with them — show up here."
                actionLabel="Browse cinema"
                onAction={() => router.push('/(tabs)/cinema')}
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

  tabsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  tabPill: {
    flex: 1,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  tabPillActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  tabLabel: { color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  tabLabelActive: { color: '#0A0A0C' },

  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
});
