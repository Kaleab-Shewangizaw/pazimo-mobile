import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PickableItemRow } from '@/components/shares/pickable-item-row';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { formatPrice } from '@/lib/pricing';
import type { TransferableBeverageSale } from '@/types/api';

const MESSAGE_LIMIT = 500;

export type ComposeBeverageStepProps = {
  sales: TransferableBeverageSale[];
  loading: boolean;
  /** saleId -> selected. Always the full quantity — drinks never split. */
  selected: Set<string>;
  onToggle: (saleId: string) => void;
  message: string;
  onChangeMessage: (text: string) => void;
  onContinue: () => void;
};

/**
 * Which drinks to send — checkbox only, no stepper: a drink transfer is
 * always FULL, so there is nothing to split and nothing to keep.
 */
function ComposeBeverageStepImpl({
  sales,
  loading,
  selected,
  onToggle,
  message,
  onChangeMessage,
  onContinue,
}: ComposeBeverageStepProps) {
  const selectedCount = sales.filter((s) => selected.has(s.saleId)).length;

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
            <PickableItemRow
              key={sale.saleId}
              title={sale.beverageName}
              subtitle={`${sale.title} · ${formatPrice(sale.totalAmount, sale.currency)}${sale.quantity > 1 ? ` · ×${sale.quantity}` : ''}`}
              selected={selected.has(sale.saleId)}
              onToggle={() => onToggle(sale.saleId)}
            />
          ))}
        </View>
      )}

      <Field
        label="Message (optional)"
        value={message}
        onChangeText={(text) => onChangeMessage(text.slice(0, MESSAGE_LIMIT))}
        placeholder="Cheers!"
        multiline
        numberOfLines={3}
        hint={`${message.length}/${MESSAGE_LIMIT}`}
      />

      <Button label="Continue" size="lg" disabled={selectedCount === 0} onPress={onContinue} />
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
