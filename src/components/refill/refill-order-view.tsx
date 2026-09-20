import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { refillSaleBarcodeUrl } from '@/api/beverages';
import { QrPlate } from '@/components/ticket/qr-plate';
import { TicketFrame } from '@/components/ticket/ticket-frame';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/pricing';
import type { RefillOrder, RefillOrderSale } from '@/types/api';

/**
 * A paid refill order, drawn on the same ticket silhouette every other
 * purchase in this app lands on — `TicketView`'s counterpart, down to the
 * bracketed white plate the code sits on. A barcode rather than a QR: the
 * counter is scanning a short pickup code, not a ticket id. The server bakes
 * that reference number as text under the bars (see `barcodeRenderer.js`),
 * so the plate is cropped short — tall enough for the bars, not the caption
 * — rather than showing the buyer a code they never need to read.
 */

/** Ceiling so the plate stays reasonable on a tablet instead of a slab. */
const PLATE_MAX = 240;
/** Tall enough for the bars; short enough that `cover` + a top anchor crops the printed reference number off the bottom. */
const PLATE_HEIGHT = 72;

export type RefillOrderViewProps = {
  order: RefillOrder;
};

function RefillOrderViewImpl({ order }: RefillOrderViewProps) {
  const window = useWindowDimensions();
  const sales = order.sales;
  if (!sales.length) return null;

  const plateWidth = Math.min(window.width - Spacing.lg * 2 - Spacing.xl * 2, PLATE_MAX);

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
            {sales.map((sale, index) => (
              <SaleCard
                key={sale.referenceNumber}
                sale={sale}
                currency={order.currency}
                plateWidth={plateWidth}
                divider={index > 0}
              />
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

function SaleCard({
  sale,
  currency,
  plateWidth,
  divider,
}: {
  sale: RefillOrderSale;
  currency: RefillOrder['currency'];
  plateWidth: number;
  divider: boolean;
}) {
  return (
    <View style={[styles.saleCard, divider && styles.saleCardDivider]}>
      <Text variant="small" style={styles.centered} numberOfLines={1}>
        {sale.beverageName} × {sale.quantity}
      </Text>
      <Text variant="caption" color="textSecondary" style={styles.centered}>
        {formatPrice(sale.totalAmount, currency)}
      </Text>

      <View style={styles.plateWrap}>
        <QrPlate size={plateWidth} height={PLATE_HEIGHT}>
          <Image
            source={{ uri: refillSaleBarcodeUrl(sale.referenceNumber) }}
            style={styles.barcode}
            contentFit="cover"
            contentPosition="top"
            transition={150}
          />
        </QrPlate>
      </View>

      <StatusPill sale={sale} />
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
        : { label: 'Ready to collect', icon: 'time-outline' as const, color: theme.text };

  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Ionicons name={icon} size={12} color={color} />
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

  codes: { marginTop: Spacing.lg, alignSelf: 'stretch' },
  saleCard: { alignItems: 'center', gap: 4, paddingVertical: Spacing.md },
  saleCardDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  plateWrap: { marginVertical: Spacing.xs },
  barcode: { width: '100%', height: '100%' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },

  details: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

export const RefillOrderView = memo(RefillOrderViewImpl);
