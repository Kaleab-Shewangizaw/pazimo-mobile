import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { iconFor } from '@/components/home/category-rail';
import { Touchable } from '@/components/ui/pressable';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { resolveImageUrl } from '@/lib/media';
import type { Category } from '@/types/api';

/**
 * Glass tile grid, two columns — a bigger, browsable alternative to the icon
 * rail up top. A light translucent white fill (not the app's usual dark
 * `theme.glass`) so the tiles read as glass against the near-black ambient
 * backdrop, rather than blending into it. Flat tint, not a real blur: this
 * sits inside the header of a scrolling FlatList, and `ui/glass.tsx` is
 * explicit that a genuine blur pass there is the easiest way to make the app
 * janky.
 */
function CategoryGridImpl({
  categories,
  loading,
}: {
  categories?: Category[];
  loading?: boolean;
}) {
  const router = useRouter();

  const onPress = useCallback((id: string) => router.push(`/discover?category=${id}`), [router]);

  if (loading) {
    return (
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width="47%" height={96} radius={Radius.xl} />
        ))}
      </View>
    );
  }

  if (!categories?.length) return null;

  return (
    <View style={styles.grid}>
      {categories.map((item) => {
        const image = resolveImageUrl(item.image);
        return (
          <Touchable
            key={item._id}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            onPress={() => onPress(item._id)}
            pressedScale={0.97}
            style={styles.tile}>
            {image ? (
              <Image source={{ uri: image }} style={styles.icon} contentFit="contain" />
            ) : (
              // The shadow-as-glow trick only renders on iOS — Android
              // shadows are a flat grey regardless of shadowColor.
              // Acceptable: the tile still reads correctly there, just
              // without the halo.
              <View style={styles.iconGlow}>
                <Ionicons name={iconFor(item.name)} size={26} color="#FFFFFF" />
              </View>
            )}
            <Text variant="callout" numberOfLines={1} style={styles.label}>
              {item.name}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  tile: {
    width: '47%',
    aspectRatio: 1.35,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  icon: { width: 30, height: 30 },
  iconGlow: {
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  label: { color: '#FFFFFF' },
});

export const CategoryGrid = memo(CategoryGridImpl);
