import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Surface } from '@/components/ui/glass';
import { Stepper } from '@/components/ui/stepper';
import { Text } from '@/components/ui/text';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveImageUrl } from '@/lib/media';
import { formatPrice } from '@/lib/pricing';
import type { RefillBeverageItem } from '@/types/api';

export type BeverageLineProps = {
  item: RefillBeverageItem;
  quantity: number;
  onChange: (quantity: number) => void;
};

/**
 * One buyable drink, shared by the event and venue refill screens.
 *
 * The photo sits on a plate the size of `item.color` (or a neutral fallback),
 * and is `contain`-fit rather than `cover` — a bottle or can shot is not a
 * background to fill the frame with, it's the product, and `cover` was
 * zooming into it and cropping the top and bottom off. Padding around the
 * image keeps it a comfortable size inside that plate rather than touching
 * every edge.
 */
function BeverageLineImpl({ item, quantity, onChange }: BeverageLineProps) {
  const theme = useTheme();
  const imageUrl = resolveImageUrl(item.image);
  const soldOut = item.remaining <= 0;

  return (
    <Surface tone="raised" style={[styles.card, soldOut && styles.cardSoldOut]}>
      <View style={[styles.plate, { backgroundColor: item.color || theme.surfaceMuted }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="contain" transition={150} />
        ) : (
          <Ionicons name="wine-outline" size={38} color="rgba(255,255,255,0.85)" />
        )}
        {soldOut ? (
          <View style={styles.soldOutBadge}>
            <Text variant="caption" style={styles.soldOutText}>
              Sold out
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.info}>
          <Text variant="callout" numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="small" color="textSecondary">
            {formatPrice(item.price, item.currency)}
            {!soldOut && item.remaining <= 5 ? ` · ${item.remaining} left` : ''}
          </Text>
        </View>

        {soldOut ? null : (
          <Stepper value={quantity} min={0} max={item.remaining} onChange={onChange} accessibilityLabel={item.name} />
        )}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  cardSoldOut: { opacity: 0.6 },
  plate: {
    width: '100%',
    aspectRatio: AspectRatio.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  image: { width: '100%', height: '100%' },
  soldOutBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(8,8,10,0.72)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  soldOutText: { color: '#FFFFFF' },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  info: { flex: 1, gap: 3 },
});

export const BeverageLine = memo(BeverageLineImpl);
