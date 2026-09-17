import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthSheet } from '@/components/account/auth-sheet';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { GlassIconButton } from '@/components/ui/glass-button';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { Touchable } from '@/components/ui/pressable';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRefresh } from '@/hooks/use-refresh';
import { formatTicketDate } from '@/lib/date';
import { resolveImageUrl } from '@/lib/media';
import { useRefillEvents, useRefillVenues } from '@/queries/beverages';
import { useAuthStore } from '@/stores/use-auth-store';
import type { RefillEventSummary, RefillVenueSummary } from '@/types/api';

/**
 * Two sources of drinks: events you hold a ticket to that happen to sell
 * them, and venues that sell them outright. Same tab-row pattern as
 * `discover.tsx` — there's no shared segmented-control component in this
 * app, this hand-rolled pill row is how tabs are done here.
 */

type RefillTab = 'events' | 'venues';

const TABS: { key: RefillTab; label: string }[] = [
  { key: 'events', label: 'Events' },
  { key: 'venues', label: 'Venues' },
];

const SKELETON_ROWS = [0, 1, 2, 3];

export default function RefillScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<RefillTab>('events');
  const [signInVisible, setSignInVisible] = useState(false);

  const { events, isLoading: eventsLoading, refetch: refetchEvents } = useRefillEvents();
  const { venues, isLoading: venuesLoading, refetch: refetchVenues } = useRefillVenues();

  const activeRefetch = tab === 'events' ? refetchEvents : refetchVenues;
  const { refreshing, onRefresh } = useRefresh(activeRefetch);

  const openEvent = useCallback(
    (event: RefillEventSummary) => {
      router.push({
        pathname: '/refill/event/[eventId]',
        params: { eventId: event.eventId, cover: event.coverImages?.[0] ?? '' },
      });
    },
    [router],
  );

  const openVenue = useCallback(
    (venue: RefillVenueSummary) => {
      router.push({
        pathname: '/refill/venue/[venueId]',
        params: { venueId: venue.venueId, cover: venue.image ?? '' },
      });
    },
    [router],
  );

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.lg;
  const loading = tab === 'events' ? eventsLoading : venuesLoading;

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader
        title="Refill"
        right={
          user ? (
            <GlassIconButton
              icon="receipt-outline"
              accessibilityLabel="Your orders"
              size={34}
              onPress={() => router.push('/refill/orders')}
            />
          ) : undefined
        }
      />

      {!user ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <EmptyState
            icon="beer-outline"
            title="Sign in to order a drink"
            message="Sign in to see events and venues where you can order a drink from your seat."
            actionLabel="Sign in"
            onAction={() => setSignInVisible(true)}
          />
        </View>
      ) : (
        <>
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

          {loading && (tab === 'events' ? events.length === 0 : venues.length === 0) ? (
            <View style={styles.list}>
              {SKELETON_ROWS.map((row) => (
                <RowSkeleton key={row} />
              ))}
            </View>
          ) : tab === 'events' ? (
            <FlatList
              key="events"
              data={events}
              keyExtractor={(event) => event.eventId}
              renderItem={({ item }) => <EventRow event={item} onPress={openEvent} />}
              contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance(insets.bottom) }]}
              refreshControl={<PageRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <EmptyState
                  icon="ticket-outline"
                  title="No drinks to order yet"
                  message="Events you hold a ticket to will show up here once they're selling drinks."
                />
              }
            />
          ) : (
            <FlatList
              key="venues"
              data={venues}
              keyExtractor={(venue) => venue.venueId}
              renderItem={({ item }) => <VenueRow venue={item} onPress={openVenue} />}
              contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance(insets.bottom) }]}
              refreshControl={<PageRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <EmptyState
                  icon="storefront-outline"
                  title="No venues selling drinks yet"
                  message="Check back soon — venues will show up here once they're set up to sell."
                />
              }
            />
          )}
        </>
      )}

      <AuthSheet visible={signInVisible} onClose={() => setSignInVisible(false)} />
    </View>
  );
}

function EventRow({ event, onPress }: { event: RefillEventSummary; onPress: (event: RefillEventSummary) => void }) {
  const cover = resolveImageUrl(event.coverImages?.[0]);

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.beverageCount} drinks available`}
      onPress={() => onPress(event)}
      pressedScale={0.98}
      haptic>
      <PosterCard image={cover} icon="ticket-outline">
        <Text variant="title" numberOfLines={1} style={styles.posterTitle}>
          {event.title}
        </Text>
        <Text variant="small" color="textSecondary" numberOfLines={1}>
          {formatTicketDate(event.startDate)}
        </Text>
        <BeverageCountChip count={event.beverageCount} />
      </PosterCard>
    </Touchable>
  );
}

function VenueRow({ venue, onPress }: { venue: RefillVenueSummary; onPress: (venue: RefillVenueSummary) => void }) {
  const image = resolveImageUrl(venue.image);

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${venue.name}, ${venue.beverageCount} drinks available`}
      onPress={() => onPress(venue)}
      pressedScale={0.98}
      haptic>
      <PosterCard image={image} icon="storefront-outline">
        <Text variant="title" numberOfLines={1} style={styles.posterTitle}>
          {venue.name}
        </Text>
        {venue.city ? (
          <Text variant="small" color="textSecondary" numberOfLines={1}>
            {venue.city}
          </Text>
        ) : null}
        <BeverageCountChip count={venue.beverageCount} />
      </PosterCard>
    </Touchable>
  );
}

/** The full-picture card both rows share — a photo with the title laid over it, the way `EventCard` does it elsewhere in the app, not a thumbnail beside the text. */
function PosterCard({
  image,
  icon,
  children,
}: {
  image: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.poster}>
      {image ? (
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.posterFallback, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons name={icon} size={34} color={theme.textMuted} />
        </View>
      )}
      <LinearGradient
        colors={['rgba(8,8,10,0)', 'rgba(8,8,10,0.55)', 'rgba(8,8,10,0.92)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.posterBody}>{children}</View>
    </View>
  );
}

function BeverageCountChip({ count }: { count: number }) {
  return (
    <View style={styles.chip}>
      <Ionicons name="wine-outline" size={11} color="#FFFFFF" />
      <Text variant="caption" style={styles.chipText}>
        {count} drink{count > 1 ? 's' : ''}
      </Text>
    </View>
  );
}

function RowSkeleton() {
  return (
    <View style={styles.poster}>
      <Skeleton width="100%" height="100%" radius={Radius.lg} />
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
  poster: {
    width: '100%',
    aspectRatio: AspectRatio.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  posterFallback: { alignItems: 'center', justifyContent: 'center' },
  posterBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.md,
    gap: 3,
  },
  posterTitle: { color: '#FFFFFF' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  chipText: { color: '#FFFFFF' },
});
