import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { formatPrice } from '@/lib/pricing';
import type { Currency } from '@/types/api';

export type BasketFooterProps = {
  itemCount: number;
  total: number;
  currency: Currency;
  onCheckout: () => void;
};

/** Nothing to show until there's a basket — an empty-cart prompt would only compete with the menu above it. */
function BasketFooterImpl({ itemCount, total, currency, onCheckout }: BasketFooterProps) {
  const insets = useSafeAreaInsets();
  if (itemCount === 0) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + Spacing.sm }]}>
      <Button
        label={`Checkout · ${formatPrice(total, currency)}`}
        size="lg"
        onPress={onCheckout}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  button: { width: '100%' },
});

export const BasketFooter = memo(BasketFooterImpl);
