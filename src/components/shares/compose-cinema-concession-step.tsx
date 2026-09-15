import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PickableItemRow } from '@/components/shares/pickable-item-row';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { formatPrice } from '@/lib/pricing';
import type { TransferableCinemaConcession } from '@/types/api';

const MESSAGE_LIMIT = 500;

export type ComposeCinemaConcessionStepProps = {
  concessions: TransferableCinemaConcession[];
  loading: boolean;
  /** sale _id -> selected. Always the full quantity — a snack sale never splits. */
  selected: Set<string>;
  onToggle: (saleId: string) => void;
  message: string;
  onChangeMessage: (text: string) => void;
  onContinue: () => void;
};

/** Which cinema snack to send — checkbox only, same reasoning as the drink picker: always the full sale. */
function ComposeCinemaConcessionStepImpl({
  concessions,
  loading,
  selected,
  onToggle,
  message,
  onChangeMessage,
  onContinue,
}: ComposeCinemaConcessionStepProps) {
  const selectedCount = concessions.filter((c) => selected.has(c._id)).length;

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
            <PickableItemRow
              key={sale._id}
              title={sale.beverageName}
              subtitle={`${sale.cinema?.name ?? 'Cinema'} · ${formatPrice(sale.totalAmount, sale.currency)}${sale.quantity > 1 ? ` · ×${sale.quantity}` : ''}`}
              selected={selected.has(sale._id)}
              onToggle={() => onToggle(sale._id)}
            />
          ))}
        </View>
      )}

      <Field
        label="Message (optional)"
        value={message}
        onChangeText={(text) => onChangeMessage(text.slice(0, MESSAGE_LIMIT))}
        placeholder="Enjoy!"
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

export const ComposeCinemaConcessionStep = memo(ComposeCinemaConcessionStepImpl);
