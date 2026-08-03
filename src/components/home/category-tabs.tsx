import { memo, useCallback, useMemo } from 'react';
import { FlatList, type ListRenderItem, StyleSheet } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import type { Category } from '@/types/api';

type Tab = { id: string | null; name: string };

const ALL_TAB: Tab = { id: null, name: 'All' };

/**
 * Plain text tabs, not chips — weight and opacity carry the active state,
 * matching the reference exactly rather than the pill/bubble treatment used
 * elsewhere in the app.
 */
function CategoryTabsImpl({
  categories,
  activeId,
  onChange,
}: {
  categories?: Category[];
  activeId: string | null;
  onChange: (id: string | null) => void;
}) {
  const tabs = useMemo<Tab[]>(
    () => [ALL_TAB, ...(categories ?? []).map((c) => ({ id: c._id, name: c.name }))],
    [categories],
  );

  const renderItem = useCallback<ListRenderItem<Tab>>(
    ({ item }) => {
      const active = item.id === activeId;
      return (
        <Touchable
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          onPress={() => onChange(item.id)}
          pressedScale={0.95}
          style={styles.tab}>
          <Text
            variant="callout"
            style={active ? styles.active : styles.inactive}
            numberOfLines={1}>
            {item.name}
          </Text>
        </Touchable>
      );
    },
    [activeId, onChange],
  );

  return (
    <FlatList
      horizontal
      data={tabs}
      keyExtractor={(item) => item.id ?? 'all'}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      initialNumToRender={8}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  tab: { paddingVertical: Spacing.xs },
  active: { color: '#FFFFFF' },
  inactive: { color: 'rgba(255,255,255,0.42)' },
});

export const CategoryTabs = memo(CategoryTabsImpl);
