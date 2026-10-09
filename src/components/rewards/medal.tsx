import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { resolveImageUrl } from '@/lib/media';
import type { Medal as MedalData, MedalTier } from '@/types/api';

// Same base hues as the dashboard's TIER_COLORS, each with a light and a
// dark stop so the default medal reads as metal rather than a flat dot.
const TIER_GRADIENT: Record<MedalTier, [string, string, string]> = {
  bronze: ['#F3C29B', '#C9814B', '#7A4422'],
  silver: ['#F4F6F8', '#B8C2CC', '#6C7884'],
  gold: ['#FFF1B8', '#F2C14E', '#A4761A'],
  platinum: ['#E8FBFD', '#9FD8DF', '#4F8E96'],
  diamond: ['#E6F2FF', '#8EC5FF', '#3B6FD8'],
};

const TIER_ICON: Record<MedalTier, keyof typeof Ionicons.glyphMap> = {
  bronze: 'medal',
  silver: 'medal',
  gold: 'trophy',
  platinum: 'trophy',
  diamond: 'diamond',
};

export type MedalProps = {
  medal: Pick<MedalData, 'tier' | 'image' | 'color' | 'unlockedAt'>;
  size?: number;
};

/** A medal on the shelf — the admin's uploaded art, or a tier-coloured default. Locked ones are dimmed with a padlock. */
function MedalImpl({ medal, size = 72 }: MedalProps) {
  const locked = !medal.unlockedAt;
  const image = resolveImageUrl(medal.image);
  const gradient = TIER_GRADIENT[medal.tier] ?? TIER_GRADIENT.bronze;
  const ring = medal.color ?? gradient[1];

  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: locked ? 'rgba(255,255,255,0.12)' : `${ring}AA`,
          opacity: locked ? 0.45 : 1,
        },
      ]}>
      {image ? (
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={medal.color ? ['#FFFFFF', medal.color, '#00000088'] : gradient}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.85, y: 0.95 }}
          style={[StyleSheet.absoluteFill, styles.center]}>
          <Ionicons name={TIER_ICON[medal.tier] ?? 'medal'} size={size * 0.46} color="rgba(255,255,255,0.92)" />
        </LinearGradient>
      )}
      {locked ? (
        <View style={[styles.lock, { width: size * 0.36, height: size * 0.36, borderRadius: size * 0.18 }]}>
          <Ionicons name="lock-closed" size={size * 0.18} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { overflow: 'hidden', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  lock: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
});

export const Medal = memo(MedalImpl);
