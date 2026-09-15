import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
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
import { Radius, Spacing } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { formatTicketDate } from '@/lib/date';
import { formatPrice } from '@/lib/pricing';
import { useMyRefillOrders } from '@/queries/beverages';
import type { PaymentStatus, RefillOrderSummary } from '@/types/api';

const HEADER_HEIGHT = 44;
const SKELETON_ROWS = [0, 1, 2];

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

  const { orders, isLoading, refetch } = useMyRefillOrders();
  const { refreshing, onRefresh } = useRefresh(refetch);

  const openOrder = useCallback(
    (order: RefillOrderSummary) => {
      router.push(`/refill/order/${order.transactionId}`);
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
        <Text variant="callout">Your orders</Text>
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

  return (
    <Touchable accessibilityRole="button" accessibilityLabel={order.title} onPress={() => onPress(order)} pressedScale={0.98}>
      <Surface tone="raised" style={styles.row}>
        <View style={[styles.icon, { backgroundColor: theme.brandTint }]}>
          <Ionicons name="beer" size={17} color={theme.text} />
        </View>
        <View style={styles.rowText}>
          <Text variant="callout" numberOfLines={1}>
            {order.title}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {formatTicketDate(order.createdAt)}
          </Text>
        </View>
        <View style={styles.rowEnd}>
          <Text variant="callout">{formatPrice(order.total, order.currency)}</Text>
          <StatusLabel status={order.status} />
        </View>
      </Surface>
    </Touchable>
  );
}

function StatusLabel({ status }: { status: PaymentStatus }) {
  const theme = useTheme();
  const { label, color } =
    status === 'COMPLETED'
      ? { label: 'Paid', color: theme.success }
      : status === 'PENDING'
        ? { label: 'Pending', color: theme.textMuted }
        : status === 'CANCELLED'
          ? { label: 'Cancelled', color: theme.textMuted }
          : { label: 'Failed', color: theme.danger };

  return (
    <Text variant="caption" style={{ color }}>
      {label}
    </Text>
  );
}

function OrderSkeleton() {
  return (
    <Surface tone="raised" style={styles.row}>
      <Skeleton width={38} height={38} radius={Radius.pill} />
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
    marginLeft: -Spacing.sm,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: Spacing.lg, gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm + 2,
  },
  icon: { width: 38, height: 38, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 3 },
  rowEnd: { alignItems: 'flex-end', gap: 3 },
});
