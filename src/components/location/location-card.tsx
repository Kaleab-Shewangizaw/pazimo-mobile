import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { memo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { MapPreview } from '@/components/location/map-preview';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { copyLocation, directionsUrl, hasExactLocation, openDirections, placeAddress, type Place } from '@/lib/maps';

export type LocationCardProps = {
  place: Place;
  /** Small caps over the name — "VENUE", "CINEMA". */
  label?: string;
};

/**
 * Where a place is, as a card you can act on: a drawn map with a pin, the
 * place's name and address, and the two things people actually do with a
 * location — get directions (opens the Maps app on the exact pin) and copy
 * it to send to a friend. Tapping the map does the same as "Directions".
 *
 * Renders nothing when there is nothing to point at (no link, no
 * coordinates, no address) rather than a card with dead buttons.
 */
function LocationCardImpl({ place, label = 'LOCATION' }: LocationCardProps) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  if (!directionsUrl(place)) return null;

  const address = placeAddress(place);
  const exact = hasExactLocation(place);
  const title = place.name || address;
  const subtitle = place.name ? address : null;

  const go = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    openDirections(place);
  };

  const copy = async () => {
    if (await copyLocation(place)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
      <Touchable
        accessibilityRole="link"
        accessibilityLabel={`Open ${title} in Maps`}
        onPress={go}
        pressedScale={0.99}>
        <MapPreview seed={title} />
        {/* Says what tapping does, right where you'd tap. */}
        <View style={[styles.openBadge, { backgroundColor: theme.glassStrong, borderColor: theme.glassBorder }]}>
          <Text variant="caption" style={styles.openText}>
            Open in Maps
          </Text>
          <Ionicons name="open-outline" size={12} color="#FFFFFF" />
        </View>
      </Touchable>

      <View style={styles.body}>
        <View style={styles.labelRow}>
          <Ionicons name="location" size={12} color={theme.textSecondary} />
          <Text variant="label" color="textSecondary">
            {label}
          </Text>
        </View>
        <Text variant="callout" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {!exact ? (
          // Honest about a best-guess pin: no link or coordinates, so Maps
          // searches the address instead.
          <Text variant="caption" color="textMuted">
            Found from the address — check the pin before you head out.
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={`Directions to ${title}`}
            onPress={go}
            pressedScale={0.96}
            style={[styles.primary, { backgroundColor: theme.brand }]}>
            <Ionicons name="navigate" size={16} color={theme.onBrand} />
            <Text variant="small" style={[styles.primaryText, { color: theme.onBrand }]}>
              Directions
            </Text>
          </Touchable>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={copied ? 'Copied' : 'Copy location'}
            onPress={copy}
            haptic
            pressedScale={0.94}
            style={[styles.secondary, { borderColor: theme.glassBorder, backgroundColor: theme.surfaceMuted }]}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={theme.text} />
            <Text variant="small" style={styles.secondaryText}>
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </Touchable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  openBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  openText: { color: '#FFFFFF' },
  body: { padding: Spacing.md, gap: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  primary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill,
  },
  primaryText: { fontFamily: FontFamily.bold },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryText: { fontFamily: FontFamily.bold },
});

export const LocationCard = memo(LocationCardImpl);
