import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveImageUrl } from '@/lib/media';
import { formatPrice } from '@/lib/pricing';
import type { SelectedConcession } from '@/stores/use-cinema-booking-store';
import type { CinemaConcessionItem } from '@/types/api';

/** Step one of the sheet: add snacks, or skip straight to payment. */

export type SnacksStepProps = {
  concessions: CinemaConcessionItem[];
  loading: boolean;
  selected: SelectedConcession[];
  onChangeQuantity: (item: CinemaConcessionItem, quantity: number) => void;
  total: number;
  quoting: boolean;
  onContinue: () => void;
};

function SnacksStepImpl({
  concessions,
  loading,
  selected,
  onChangeQuantity,
  total,
  quoting,
  onContinue,
}: SnacksStepProps) {
  const theme = useTheme();

  return (
    <View>
      {loading ? null : !concessions.length ? (
        <Text variant="small" color="textMuted" style={styles.empty}>
          No snacks available at this cinema right now.
        </Text>
      ) : (
        <View style={styles.list}>
          {concessions.map((item) => {
            const picked = selected.find((c) => c.cinemaBeverage === item._id);
            return (
              <View key={item._id} style={[styles.card, { borderColor: theme.hairline }]}>
                <Image
                  source={{ uri: resolveImageUrl(item.beverage.image) ?? undefined }}
                  style={styles.cardImage}
                  contentFit="cover"
                  transition={150}
                />
                <View style={styles.cardBody}>
                  <Text variant="body" numberOfLines={1}>
                    {item.beverage.name}
                  </Text>
                  <Text variant="small" color="textSecondary">
                    {formatPrice(item.price, 'ETB')}
                  </Text>
                </View>
                <Stepper
                  value={picked?.quantity ?? 0}
                  max={20}
                  onChange={(quantity) => onChangeQuantity(item, quantity)}
                  accessibilityLabel={item.beverage.name}
                />
              </View>
            );
          })}
        </View>
      )}

      <View style={[styles.totalRow, { backgroundColor: theme.brandTint }]}>
        <Text variant="small" color="textSecondary">
          {selected.length ? `${selected.reduce((n, c) => n + c.quantity, 0)} snacks` : 'Total'}
        </Text>
        <Text variant="callout">{quoting ? '…' : formatPrice(total, 'ETB')}</Text>
      </View>

      <Button label={selected.length ? 'Continue to payment' : 'Skip snacks'} size="lg" onPress={onContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: Spacing.lg, textAlign: 'center' },
  list: { gap: Spacing.sm, marginBottom: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardImage: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.06)' },
  cardBody: { flex: 1, gap: 2 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
});

export const SnacksStep = memo(SnacksStepImpl);
