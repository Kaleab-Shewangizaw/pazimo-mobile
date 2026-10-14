import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { DirectionsChip } from '@/components/location/directions-chip';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { directionsUrl, openDirections, placeAddress, type Place } from '@/lib/maps';

/**
 * A one-row "where is this" for screens whose real content is something
 * else — a venue's drinks menu, a cinema's programme: pin, address, and a
 * Directions pill. Slim on purpose, so it answers the question without
 * pushing the menu down the way a full `LocationCard` would.
 */
function LocationStripImpl({ place }: { place: Place }) {
  const theme = useTheme();
  if (!directionsUrl(place)) return null;

  const address = placeAddress(place) || 'See it on the map';

  return (
    <Touchable
      accessibilityRole="link"
      accessibilityLabel={`${address}, get directions`}
      onPress={() => openDirections(place)}
      pressedScale={0.99}
      style={[styles.strip, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
      <View style={[styles.pin, { backgroundColor: theme.surfaceMuted }]}>
        <Ionicons name="location" size={16} color={theme.text} />
      </View>
      <Text variant="small" numberOfLines={2} style={styles.address}>
        {address}
      </Text>
      <DirectionsChip place={place} tone="solid" />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    paddingRight: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pin: { width: 34, height: 34, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  address: { flex: 1 },
});

export const LocationStrip = memo(LocationStripImpl);
