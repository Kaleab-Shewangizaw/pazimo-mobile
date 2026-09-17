import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { refillSaleBarcodeUrl } from '@/api/beverages';
import { TicketFrame } from '@/components/ticket/ticket-frame';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/pricing';
import type { RefillOrder, RefillOrderSale } from '@/types/api';

/**
 * A paid refill order, drawn on the same ticket silhouette every other
 * purchase in this app lands on — `CinemaTicketView`'s counterpart. A
 * barcode rather than a QR: the counter is scanning a short pickup code, not
 * a ticket id, and it prints that code under the bars itself (see
 * `barcodeRenderer.js` server-side), so nothing needs to be shown twice.
 */

export type RefillOrderViewProps = {
  order: RefillOrder;
};

function RefillOrderViewImpl({ order }: RefillOrderViewProps) {
  const sales = order.sales;
  if (!sales.length) return null;

  return (
    <TicketFrame
      stub={
        <View style={styles.stub}>
          <Ionicons name="beer-outline" size={32} color="#FFFFFF" />
          <Text variant="heading" role="heading" style={styles.centered}>
            Drinks paid for
          </Text>
          <Text variant="small" color="textSecondary" style={styles.centered}>
            {sales.length > 1
              ? 'Show these barcodes at the counter to collect your order'
              : 'Show this barcode at the counter to collect your order'}
          </Text>

          <View style={styles.codes}>
            {sales.map((sale) => (
              <SaleCard key={sale.referenceNumber} sale={sale} currency={order.currency} />
            ))}
          </View>
        </View>
      }
      details={
        <View style={styles.details}>
          <View style={styles.totalRow}>
            <Text variant="callout" color="textSecondary">
              Total
            </Text>
            <Text variant="callout">{formatPrice(order.total, order.currency)}</Text>
          </View>
        </View>
      }
    />
  );
}

function SaleCard({ sale, currency }: { sale: RefillOrderSale; currency: RefillOrder['currency'] }) {
  return (
    <View style={styles.codePlate}>
      <Image
        source={{ uri: refillSaleBarcodeUrl(sale.referenceNumber) }}
        style={styles.barcode}
        contentFit="contain"
        transition={150}
      />
      <View style={styles.codeMeta}>
        <Text variant="small" style={styles.codeMetaText} numberOfLines={1}>
          {sale.beverageName} × {sale.quantity} · {formatPrice(sale.totalAmount, currency)}
        </Text>
        <StatusPill sale={sale} />
      </View>
    </View>
  );
}

function StatusPill({ sale }: { sale: RefillOrderSale }) {
  const theme = useTheme();

  const { label, icon, color } =
    sale.status === 'refunded'
      ? { label: 'Refunded', icon: 'return-down-back-outline' as const, color: theme.danger }
      : sale.redeemedAt
        ? { label: 'Collected', icon: 'checkmark-circle' as const, color: theme.success }
        : { label: 'Ready', icon: 'time-outline' as const, color: '#0A0A0C' };

  const ready = !sale.redeemedAt && sale.status !== 'refunded';

  return (
    <View style={[styles.pill, ready ? styles.pillReady : { backgroundColor: 'rgba(10,10,12,0.06)' }]}>
      <Ionicons name={icon} size={11} color={color} />
      <Text variant="caption" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stub: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  centered: { textAlign: 'center' },

  codes: { marginTop: Spacing.lg, gap: Spacing.sm, alignSelf: 'stretch' },
  codePlate: {
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: 6,
  },
  barcode: { width: '100%', height: 64 },
  codeMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  codeMetaText: { color: 'rgba(10,10,12,0.6)' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  pillReady: { backgroundColor: 'rgba(10,10,12,0.08)' },

  details: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

export const RefillOrderView = memo(RefillOrderViewImpl);
