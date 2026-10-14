import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { directionsUrl, openDirections, type Place } from '@/lib/maps';

export type DirectionsChipProps = {
  place: Place;
  /**
   * `glass` sits over photos (list rows, headers); `solid` is the white
   * primary pill for plain surfaces.
   */
  tone?: 'glass' | 'solid';
  /** Just the icon — for tight spots like a nav bar. */
  iconOnly?: boolean;
};

/**
 * One tap to the Maps app, wherever a place is mentioned — a cinema row, a
 * venue header, a ticket. The compact sibling of `LocationCard`. Renders
 * nothing when there's nowhere to send anyone.
 *
 * Its own press target, so inside a tappable row it opens directions rather
 * than the row.
 */
function DirectionsChipImpl({ place, tone = 'glass', iconOnly = false }: DirectionsChipProps) {
  const theme = useTheme();
  if (!directionsUrl(place)) return null;

  const solid = tone === 'solid';
  const color = solid ? theme.onBrand : '#FFFFFF';

  return (
    <Touchable
      accessibilityRole="link"
      accessibilityLabel={place.name ? `Directions to ${place.name}` : 'Directions'}
      onPress={() => openDirections(place)}
      haptic
      pressedScale={0.92}
      hitSlop={8}
      style={[
        styles.chip,
        iconOnly && styles.iconOnly,
        solid
          ? { backgroundColor: theme.brand, borderColor: theme.brand }
          : { backgroundColor: 'rgba(10,10,12,0.55)', borderColor: 'rgba(255,255,255,0.22)' },
      ]}>
      <Ionicons name="navigate" size={iconOnly ? 16 : 13} color={color} />
      {iconOnly ? null : (
        <Text variant="caption" style={[styles.text, { color }]}>
          Directions
        </Text>
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconOnly: { width: 36, height: 36, paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center' },
  text: { fontFamily: FontFamily.bold },
});

export const DirectionsChip = memo(DirectionsChipImpl);
