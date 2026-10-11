import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { QuantityPickRow } from '@/components/shares/quantity-pick-row';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { formatPrice } from '@/lib/pricing';
import type { TransferableBeverageSale } from '@/types/api';

export type ComposeBeverageStepProps = {
  sales: TransferableBeverageSale[];
  loading: boolean;
  /** saleId -> how many to send. Absent (or 0) is not picked. */
  quantities: Map<string, number>;
  onChangeQuantity: (saleId: string, quantity: number) => void;
};

/**
 * Which drinks to send, and how many of each — 2 of your 3 beers go to your
 * friend, 1 stays with you (the backend splits the sale on accept, each part
 * with its own pickup code).
 */
function ComposeBeverageStepImpl({
  sales,
  loading,
  quantities,
  onChangeQuantity,
}: ComposeBeverageStepProps) {
  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
      ) : sales.length === 0 ? (
        <Text variant="small" color="textMuted" style={styles.empty}>
          Nothing here is available to send right now.
        </Text>
      ) : (
        <View style={styles.list}>
          {sales.map((sale) => (
            <QuantityPickRow
              key={sale.saleId}
              title={sale.beverageName}
              subtitle={`${sale.title} · ${formatPrice(sale.unitPrice, sale.currency)} each${sale.quantity > 1 ? ` · ×${sale.quantity}` : ''}`}
              available={sale.quantity}
              value={quantities.get(sale.saleId) ?? 0}
              onChange={(q) => onChangeQuantity(sale.saleId, q)}
              noun={['drink', 'drinks']}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  list: { gap: Spacing.sm },
  spinner: { marginVertical: Spacing.lg },
  empty: { textAlign: 'center', paddingVertical: Spacing.lg },
});

export const ComposeBeverageStep = memo(ComposeBeverageStepImpl);
