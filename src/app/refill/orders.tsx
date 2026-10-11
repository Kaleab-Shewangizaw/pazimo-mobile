import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { Surface } from '@/components/ui/glass';
import { Touchable } from '@/components/ui/pressable';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Radius, Spacing, type Theme } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/pricing';
import { useMyRefillOrders } from '@/queries/beverages';
import type { RefillOrderSummary } from '@/types/api';

const HEADER_HEIGHT = 44;
const SKELETON_ROWS = [0, 1, 2];
const SHOWN_STATUSES = new Set<RefillOrderSummary['status']>(['PAID', 'COMPLETED', 'PENDING']);

/**
 * Every drink order this account has paid for, event or venue — the answer
 * to "where do I go to redeem the beer I bought". Opening one drops back into
 * `/refill/order/[txn]`, the same screen a fresh payment lands on: for an
 * already-settled order the watcher there resolves on its first poll and
 * shows the reference codes straight away.
 */
export default function RefillOrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const goBack = useGoBack('/(tabs)/refill');

  const { orders: allOrders, isLoading, refetch } = useMyRefillOrders();
  // Only orders that actually bought something (or are still settling) — a
  // failed or cancelled payment produced no drinks, so there's nothing in it
  // to collect and nothing to open.
  const orders = useMemo(() => allOrders.filter((order) => SHOWN_STATUSES.has(order.status)), [allOrders]);
  const { refreshing, onRefresh } = useRefresh(refetch);

  const openOrder = useCallback(
    (order: RefillOrderSummary) => {
      // `from` tells the order screen to come back here on Done.
      router.push({ pathname: '/refill/order/[txn]', params: { txn: order.transactionId, from: 'orders' } });
    },
    [router],
  );

  return (
    <View style={styles.screen}>
      <AmbientBackground />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Back to Refill"
          onPress={goBack}
          pressedScale={0.9}
          style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Touchable>
        <Text variant="title" style={styles.headerTitle}>
          Your orders
        </Text>
        <View style={styles.headerButton} />
      </View>

      {isLoading ? (
        <View style={styles.list}>
          {SKELETON_ROWS.map((row) => (
            <OrderSkeleton key={row} />
          ))}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(order) => order.transactionId}
          renderItem={({ item }) => <OrderRow order={item} onPress={openOrder} />}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance(insets.bottom) }]}
          refreshControl={<PageRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No drink orders yet"
              message="Drinks you buy through Refill will show up here, with the reference number you show at the counter."
            />
          }
        />
      )}
    </View>
  );
}

function OrderRow({ order, onPress }: { order: RefillOrderSummary; onPress: (order: RefillOrderSummary) => void }) {
  const theme = useTheme();
  const status = orderStatus(order.status, theme);
  const atVenue = order.channel === 'VENUE';

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${order.title}, ${formatPrice(order.total, order.currency)}, ${status.label}`}
      onPress={() => onPress(order)}
      pressedScale={0.98}>
      <Surface tone="raised" style={styles.row}>
        <View style={[styles.icon, { backgroundColor: theme.brandTint }]}>
          <Ionicons name={atVenue ? 'storefront-outline' : 'beer-outline'} size={20} color={theme.text} />
        </View>

        <View style={styles.rowText}>
          <Text variant="callout" numberOfLines={1}>
            {order.title}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {atVenue ? 'Venue' : 'Event'} · {formatOrderDate(order.createdAt)}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: status.tint }]}>
            <Ionicons name={status.icon} size={12} color={status.color} />
            <Text variant="caption" style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.rowEnd}>
          <Text variant="callout" style={styles.price}>
            {formatPrice(order.total, order.currency)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </View>
      </Surface>
    </Touchable>
  );
}

type StatusLook = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  tint: string;
};

/**
 * `Payment.status` straight from the backend: a settled payment is `PAID`
 * there. `COMPLETED` is what the payment-status poll maps that to, so both
 * read as paid — anything unrecognised was the bug where every successful
 * order showed "Failed".
 */
function orderStatus(status: RefillOrderSummary['status'], theme: Theme): StatusLook {
  switch (status) {
    case 'PAID':
    case 'COMPLETED':
      return { label: 'Paid', icon: 'checkmark-circle', color: theme.success, tint: 'rgba(52,211,153,0.14)' };
    case 'PENDING':
      return { label: 'Processing', icon: 'time-outline', color: theme.textSecondary, tint: 'rgba(161,161,170,0.14)' };
    case 'CANCELLED':
      return { label: 'Cancelled', icon: 'close-circle-outline', color: theme.textSecondary, tint: 'rgba(161,161,170,0.14)' };
    default:
      return { label: 'Failed', icon: 'alert-circle-outline', color: theme.danger, tint: 'rgba(251,113,133,0.14)' };
  }
}

function formatOrderDate(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '';
  const date = when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

function OrderSkeleton() {
  return (
    <Surface tone="raised" style={styles.row}>
      <Skeleton width={44} height={44} radius={Radius.md} />
      <View style={styles.rowText}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={12} />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerButton: {
    width: HEADER_HEIGHT,
    height: HEADER_HEIGHT,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center' },
  list: { padding: Spacing.lg, gap: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 4 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  statusText: { fontWeight: '600' },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  price: { fontWeight: '700' },
});
