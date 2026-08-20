import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Surface } from '@/components/ui/glass';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveImageUrl } from '@/lib/media';
import type { Cinema } from '@/types/api';

/**
 * The cinema list. A row is deliberately quiet — a logo, a name, a city — because
 * this is a junction, not a destination: the thing worth looking at is one tap
 * further in, and every gram of decoration here is weight between someone and
 * the films.
 *
 * `Surface`, not `Glass`: these are list rows, and real blur in a list is the
 * documented way to make this app janky (see ui/glass.tsx).
 */

export type CinemaRowProps = {
  cinema: Cinema;
  selected?: boolean;
  onPress: (cinema: Cinema) => void;
};

function CinemaRowImpl({ cinema, selected = false, onPress }: CinemaRowProps) {
  const theme = useTheme();
  const logo = resolveImageUrl(cinema.image);
  const where = [cinema.city, cinema.address].filter(Boolean).join(' · ');

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${cinema.name}${where ? `, ${where}` : ''}`}
      onPress={() => onPress(cinema)}
      pressedScale={0.98}
    >
      <Surface radius={Radius.lg} style={[styles.row, selected && { borderColor: theme.brand }]}>
        <View style={styles.logo}>
          {logo ? (
            <Image
              source={{ uri: logo }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={160}
              cachePolicy="memory-disk"
              recyclingKey={cinema._id}
            />
          ) : (
            <Ionicons name="business-outline" size={20} color={theme.textMuted} />
          )}
        </View>

        <View style={styles.text}>
          <Text variant="callout" numberOfLines={1}>
            {cinema.name}
          </Text>
          {where ? (
            <Text variant="small" color="textSecondary" numberOfLines={1}>
              {where}
            </Text>
          ) : null}
        </View>

        <Ionicons
          name={selected ? 'checkmark-circle' : 'chevron-forward'}
          size={selected ? 20 : 18}
          color={selected ? theme.brand : theme.textMuted}
        />
      </Surface>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  text: { flex: 1, gap: 1 },
});

export const CinemaRow = memo(CinemaRowImpl);
