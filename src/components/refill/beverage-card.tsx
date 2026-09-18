import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Surface } from '@/components/ui/glass';
import { Stepper } from '@/components/ui/stepper';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveImageUrl } from '@/lib/media';
import { formatPrice } from '@/lib/pricing';
import type { RefillBeverageItem } from '@/types/api';

/**
 * One buyable drink, drawn as a square-plated grid tile rather than the old
 * full-width row — the plate used to run the whole row width at `card`
 * (3/2), so a screen fit barely a drink and a half. Two of these fit side by
 * side at a size that still reads clearly.
 */

export type BeverageCardProps = {
  item: RefillBeverageItem;
  quantity: number;
  onChange: (quantity: number) => void;
};

function BeverageCardImpl({ item, quantity, onChange }: BeverageCardProps) {
  const theme = useTheme();
  const imageUrl = resolveImageUrl(item.image);
  const soldOut = item.remaining <= 0;
  const happyHour = item.isHappyHour === true;

  return (
    <Surface tone="raised" style={[styles.card, soldOut && styles.cardSoldOut, happyHour && styles.cardHappyHour]}>
      <View style={[styles.plate, { backgroundColor: item.color || theme.surfaceMuted }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="contain" transition={150} />
        ) : (
          <Ionicons name="wine-outline" size={30} color="rgba(255,255,255,0.85)" />
        )}

        {happyHour ? (
          <View style={styles.happyHourBadge}>
            <Ionicons name="flash" size={11} color={theme.onBrand} />
            <Text variant="caption" style={styles.happyHourBadgeText} numberOfLines={1}>
              Happy hour
            </Text>
          </View>
        ) : null}

        {soldOut ? (
          <View style={styles.soldOutBadge}>
            <Text variant="caption" style={styles.soldOutText}>
              Sold out
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text variant="small" numberOfLines={1}>
          {item.name}
        </Text>

        {happyHour && item.originalPrice != null ? (
          <View style={styles.priceRow}>
            <Text variant="callout" style={{ color: theme.happyHour }} numberOfLines={1}>
              {formatPrice(item.price, item.currency)}
            </Text>
            <Text variant="caption" color="textMuted" style={styles.strike} numberOfLines={1}>
              {formatPrice(item.originalPrice, item.currency)}
            </Text>
          </View>
        ) : (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {formatPrice(item.price, item.currency)}
            {!soldOut && item.remaining <= 5 ? ` · ${item.remaining} left` : ''}
          </Text>
        )}

        {soldOut ? (
          <View style={styles.stepperSlot} />
        ) : (
          <View style={styles.stepperSlot}>
            <Stepper value={quantity} min={0} max={item.remaining} onChange={onChange} accessibilityLabel={item.name} />
          </View>
        )}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden' },
  cardSoldOut: { opacity: 0.6 },
  cardHappyHour: { borderWidth: 1, borderColor: 'rgba(251,191,36,0.45)' },
  plate: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  image: { width: '100%', height: '100%' },
  happyHourBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FBBF24',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  happyHourBadgeText: { color: '#0A0A0B' },
  soldOutBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(8,8,10,0.72)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  soldOutText: { color: '#FFFFFF' },
  body: { padding: Spacing.sm + 2, gap: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  strike: { textDecorationLine: 'line-through' },
  stepperSlot: { marginTop: Spacing.xs, alignItems: 'center', minHeight: 32 },
});

export const BeverageCard = memo(BeverageCardImpl);
