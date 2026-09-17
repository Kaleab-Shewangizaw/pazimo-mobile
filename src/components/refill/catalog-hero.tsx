import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Photo behind the bar, not a tall banner pushing the menu down the screen. */
const HERO_CONTENT_HEIGHT = 108;
const BACK_BUTTON = 40;

/**
 * The header both refill catalog screens share: a normal nav bar — back
 * button and title on the same row, right under the status bar — laid over
 * the event's or venue's own cover art instead of a flat title bar. The
 * photo answers "which event/venue am I buying from"; it does not get its
 * own banner height to do it, and the title never leaves the top row.
 */
export type CatalogHeroProps = {
  cover: string | null;
  title: string;
  subtitle?: string | null;
  onBack: () => void;
  /** A pill or badge, e.g. the drink count, trailing the title row. */
  accessory?: ReactNode;
};

function CatalogHeroImpl({ cover, title, subtitle, onBack, accessory }: CatalogHeroProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const height = insets.top + HERO_CONTENT_HEIGHT;

  return (
    <View style={[styles.hero, { height }]}>
      {cover ? (
        <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surfaceMuted }]} />
      )}

      <LinearGradient
        colors={['rgba(8,8,10,0.8)', 'rgba(8,8,10,0.4)', theme.background]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.row, { paddingTop: insets.top + Spacing.sm }]}>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Back to Refill"
          onPress={onBack}
          pressedScale={0.9}
          haptic
          style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Touchable>

        <View style={styles.titles}>
          <Text variant="title" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="small" color="textSecondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {accessory}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    width: BACK_BUTTON,
    height: BACK_BUTTON,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, gap: 1 },
  title: { color: '#FFFFFF' },
});

export const CatalogHero = memo(CatalogHeroImpl);
