import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveImageUrl } from '@/lib/media';
import type { EventVenue } from '@/types/api';

/**
 * Mirrors `CinemaRow`'s look — the same "pick the place by its photo" list —
 * but nothing here is a link off the venue yet: events don't reference this
 * directory, so there is no venue detail screen or filtered event list to
 * navigate to. `onPress` is optional and, until that link exists, the row
 * skips the chevron/checkmark corner rather than promising a destination it
 * can't reach.
 */

const ROW_HEIGHT = 116;

export type VenueRowProps = {
  venue: EventVenue;
  selected?: boolean;
  onPress?: (venue: EventVenue) => void;
};

function VenueRowImpl({ venue, selected = false, onPress }: VenueRowProps) {
  const theme = useTheme();
  const cover = resolveImageUrl(venue.image);
  const where = [venue.city, venue.address].filter(Boolean).join(' · ');

  return (
    <Touchable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      accessibilityLabel={`${venue.name}${where ? `, ${where}` : ''}`}
      onPress={onPress ? () => onPress(venue) : undefined}
      disabled={!onPress}
      pressedScale={onPress ? 0.98 : 1}
      style={[styles.card, { borderColor: selected ? theme.brand : theme.hairline }]}>
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          recyclingKey={venue._id}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surfaceMuted }]} />
      )}

      <View style={[StyleSheet.absoluteFill, styles.wash]} />
      <LinearGradient
        colors={['rgba(6,6,8,0.78)', 'rgba(6,6,8,0.40)', 'rgba(6,6,8,0.68)']}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.body}>
        <Text variant="callout" style={styles.title} numberOfLines={2}>
          {venue.name}
        </Text>
        {where ? (
          <View style={styles.whereRow}>
            <Ionicons name="location-sharp" size={12} color="rgba(255,255,255,0.75)" />
            <Text variant="caption" style={styles.where} numberOfLines={1}>
              {where}
            </Text>
          </View>
        ) : null}
      </View>

      {onPress ? (
        <View style={styles.corner}>
          <Ionicons
            name={selected ? 'checkmark-circle' : 'chevron-forward'}
            size={selected ? 22 : 18}
            color={selected ? theme.brand : '#FFFFFF'}
          />
        </View>
      ) : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: ROW_HEIGHT,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  wash: { backgroundColor: 'rgba(6,6,8,0.20)' },

  body: {
    paddingLeft: Spacing.lg,
    paddingRight: 48,
    gap: 3,
  },
  title: { color: '#FFFFFF', letterSpacing: -0.3 },
  whereRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  where: { color: 'rgba(255,255,255,0.75)', flexShrink: 1 },

  corner: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
  },
});

export const VenueRow = memo(VenueRowImpl);
