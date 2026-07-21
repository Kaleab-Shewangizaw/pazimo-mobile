import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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

const keyExtractor = (category: Category) => category._id;

function CategoryRailImpl({
  categories,
  loading,
}: {
  categories?: Category[];
  loading?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();

  const renderItem = useCallback<ListRenderItem<Category>>(
    ({ item }) => {
      const image = resolveImageUrl(item.image);
      return (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={item.name}
          onPress={() => router.push(`/discover?category=${item._id}`)}
          style={styles.item}>
          <View style={[styles.bubble, { backgroundColor: theme.brandTint }]}>
            {image ? (
              <Image source={{ uri: image }} style={styles.image} contentFit="cover" />
            ) : (
              <Ionicons name={iconFor(item.name)} size={22} color={theme.brand} />
            )}
          </View>
          <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.label}>
            {item.name}
          </Text>
        </Touchable>
      );
    },
    [router, theme.brand, theme.brandTint],
  );

  if (loading) {
    return (
      <View style={styles.skeletonRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.item}>
            <Skeleton width={56} height={56} radius={Radius.pill} />
            <Skeleton width={44} height={10} />
          </View>
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
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      initialNumToRender={6}
      windowSize={3}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  skeletonRow: { flexDirection: 'row', gap: Spacing.lg, paddingHorizontal: Spacing.lg },
  item: { alignItems: 'center', gap: Spacing.sm, width: 64 },
  bubble: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  label: { textAlign: 'center' },
});

export const CategoryRail = memo(CategoryRailImpl);
