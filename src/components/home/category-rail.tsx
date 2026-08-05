import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { resolveImageUrl } from '@/lib/media';
import type { Category } from '@/types/api';

/**
 * The Category model has an `image` (an upload path) but no `icon`, and many
 * rows have neither, so this falls back to a keyword-matched Ionicon.
 */
const ICON_BY_KEYWORD: [RegExp, keyof typeof Ionicons.glyphMap][] = [
  [/music|concert|dj|festival/i, 'musical-notes'],
  [/sport|game|match|football|run/i, 'football'],
  [/tech|conference|summit|hack/i, 'laptop'],
  [/art|exhibit|gallery|theat/i, 'color-palette'],
  [/food|drink|dining|taste/i, 'restaurant'],
  [/business|network|career/i, 'briefcase'],
  [/party|night|club/i, 'sparkles'],
  [/edu|workshop|class|train/i, 'school'],
  [/health|fitness|yoga|well/i, 'fitness'],
  [/film|movie|cinema/i, 'film'],
];

function iconFor(name: string): keyof typeof Ionicons.glyphMap {
  return ICON_BY_KEYWORD.find(([pattern]) => pattern.test(name))?.[1] ?? 'pricetag';
}

const TILE_WIDTH = 104;
const GAP = Spacing.md;

/** Fixed geometry lets the list skip measurement entirely while scrolling. */
const getItemLayout = (_: unknown, index: number) => ({
  length: TILE_WIDTH + GAP,
  offset: (TILE_WIDTH + GAP) * index,
  index,
});

const keyExtractor = (category: Category) => category._id;

/**
 * Glass tiles on a horizontal rail. The light translucent white fill (not the
 * app's usual dark `theme.glass`) is carried over from the grid this replaced,
 * so the tiles still read as glass against the near-black ambient backdrop
 * rather than blending into it. Flat tint, not a real blur — `ui/glass.tsx` is
 * explicit that a genuine blur pass inside a scrolling list is the easiest way
 * to make the app janky.
 */
function CategoryRailImpl({ categories, loading }: { categories?: Category[]; loading?: boolean }) {
  const router = useRouter();

  const renderItem = useCallback<ListRenderItem<Category>>(
    ({ item }) => {
      const image = resolveImageUrl(item.image);
      return (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={item.name}
          onPress={() => router.push(`/discover?category=${item._id}`)}
          pressedScale={0.95}
          style={styles.tile}>
          {image ? (
            <Image source={{ uri: image }} style={styles.icon} contentFit="contain" />
          ) : (
            // The shadow-as-glow trick only renders on iOS — Android shadows
            // are a flat grey regardless of shadowColor. Acceptable: the tile
            // still reads correctly there, just without the halo.
            <View style={styles.iconGlow}>
              <Ionicons name={iconFor(item.name)} size={24} color="#FFFFFF" />
            </View>
          )}
          <Text variant="small" numberOfLines={1} style={styles.label}>
            {item.name}
          </Text>
        </Touchable>
      );
    },
    [router],
  );

  if (loading) {
    return (
      <View style={styles.skeletonRow}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={TILE_WIDTH} height={92} radius={Radius.xl} />
        ))}
      </View>
    );
  }

  if (!categories?.length) return null;

  return (
    <FlatList
      horizontal
      data={categories}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      windowSize={5}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: GAP },
  skeletonRow: { flexDirection: 'row', gap: GAP, paddingHorizontal: Spacing.lg },
  tile: {
    width: TILE_WIDTH,
    height: 92,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  icon: { width: 28, height: 28 },
  iconGlow: {
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  label: { color: '#FFFFFF', textAlign: 'center' },
});

export const CategoryRail = memo(CategoryRailImpl);
