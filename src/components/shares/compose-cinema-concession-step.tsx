import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { QuantityPickRow } from '@/components/shares/quantity-pick-row';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { formatPrice } from '@/lib/pricing';
import type { TransferableCinemaConcession } from '@/types/api';

export type ComposeCinemaConcessionStepProps = {
  concessions: TransferableCinemaConcession[];
  loading: boolean;
  /** sale _id -> how many to send. Absent (or 0) is not picked. */
  quantities: Map<string, number>;
  onChangeQuantity: (saleId: string, quantity: number) => void;
};

/**
 * Which cinema snacks to send, and how many of each — 2 of your 4 popcorns
 * go to your friend, 2 stay with you (the backend splits the sale on
 * accept, each half with its own pickup code).
 */
function ComposeCinemaConcessionStepImpl({
  concessions,
  loading,
  quantities,
  onChangeQuantity,
}: ComposeCinemaConcessionStepProps) {
  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
      ) : concessions.length === 0 ? (
        <Text variant="small" color="textMuted" style={styles.empty}>
          Nothing here is available to send right now.
        </Text>
      ) : (
        <View style={styles.list}>
          {concessions.map((sale) => (
            <QuantityPickRow
              key={sale._id}
              title={sale.beverageName}
              subtitle={`${sale.cinema?.name ?? 'Cinema'} · ${formatPrice(sale.unitPrice, sale.currency)} each${sale.quantity > 1 ? ` · ×${sale.quantity}` : ''}`}
              available={sale.quantity}
              value={quantities.get(sale._id) ?? 0}
              onChange={(q) => onChangeQuantity(sale._id, q)}
              noun={['snack', 'snacks']}
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

export const ComposeCinemaConcessionStep = memo(ComposeCinemaConcessionStepImpl);
