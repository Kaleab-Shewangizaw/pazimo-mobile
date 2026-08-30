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
import type { Cinema } from '@/types/api';

/**
 * The cinema list, styled the same way as an event on the tickets tab: the
 * cinema's own image full-bleed behind the row, dimmed for contrast, name and
 * location over it. Consistent with tickets because both are "pick the thing
 * whose artwork you recognise" lists — a quiet logo tile made a cinema harder
 * to spot at a glance than the picture it already gave us.
 */

const ROW_HEIGHT = 132;

export type CinemaRowProps = {
  cinema: Cinema;
  selected?: boolean;
  onPress: (cinema: Cinema) => void;
};

function CinemaRowImpl({ cinema, selected = false, onPress }: CinemaRowProps) {
  const theme = useTheme();
  const cover = resolveImageUrl(cinema.image);
  const where = [cinema.city, cinema.address].filter(Boolean).join(' · ');

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${cinema.name}${where ? `, ${where}` : ''}`}
      onPress={() => onPress(cinema)}
      pressedScale={0.98}
      style={[styles.card, { borderColor: selected ? theme.brand : theme.hairline }]}>
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          recyclingKey={cinema._id}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surfaceMuted }]} />
      )}

      {/* Two passes: a flat wash for a contrast floor over any photo, then a
          left-heavy ramp so the text column is darkest where the words are. */}
      <View style={[StyleSheet.absoluteFill, styles.wash]} />
      <LinearGradient
        colors={['rgba(6,6,8,0.92)', 'rgba(6,6,8,0.62)', 'rgba(6,6,8,0.86)']}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.body}>
        <Text variant="callout" style={styles.title} numberOfLines={2}>
          {cinema.name}
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

      <View style={styles.corner}>
        <Ionicons
          name={selected ? 'checkmark-circle' : 'chevron-forward'}
          size={selected ? 22 : 18}
          color={selected ? theme.brand : '#FFFFFF'}
        />
      </View>
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
  wash: { backgroundColor: 'rgba(6,6,8,0.35)' },

  body: {
    paddingLeft: Spacing.lg,
    // Clear of the corner indicator, so a long name never runs under it.
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

export const CinemaRow = memo(CinemaRowImpl);
