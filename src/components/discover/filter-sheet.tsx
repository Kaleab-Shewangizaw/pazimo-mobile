import { type ReactNode, memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  type DateRange,
  type PanelFilters,
  type SortOption,
  activeFilterCount,
} from '@/queries/discover';
import type { Category } from '@/types/api';

/**
 * Everything that used to sit in the chip row under the search field, plus the
 * filters that had nowhere to live there.
 *
 * The pills are deliberately *not* glass. The sheet itself is a frosted panel,
 * and glass nested in glass blurs the panel rather than the page behind it,
 * which flattens it into a grey slab — so in here the app's flat translucent
 * fill is the correct material, exactly as the ticket rows use it.
 *
 * Changes apply live rather than behind an "Apply" button: the footer reports
 * the result count as you tap, so the sheet answers "how much does this narrow
 * things?" before you commit to closing it.
 */

const DATE_OPTIONS: { id: DateRange; label: string }[] = [
  { id: 'any', label: 'Any time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'soonest', label: 'Starting soonest' },
];

function FilterPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      haptic
      pressedScale={0.95}
      style={[
        styles.pill,
        selected
          ? { backgroundColor: theme.brand, borderColor: theme.brand }
          : { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: theme.hairline },
      ]}>
      <Text variant="small" style={{ color: selected ? theme.onBrand : '#FFFFFF' }} numberOfLines={1}>
        {label}
      </Text>
    </Touchable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" color="textSecondary">
        {title.toUpperCase()}
      </Text>
      <View style={styles.pillWrap}>{children}</View>
    </View>
  );
}

export type FilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  categories?: Category[];
  filters: PanelFilters;
  onChange: (patch: Partial<PanelFilters>) => void;
  onReset: () => void;
  /** Live count under the current selection, shown on the dismiss button. */
  resultCount: number;
};

function FilterSheetImpl({
  visible,
  onClose,
  categories,
  filters,
  onChange,
  onReset,
  resultCount,
}: FilterSheetProps) {
  const theme = useTheme();
  const active = activeFilterCount(filters);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text variant="title">Filters</Text>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Reset all filters"
          accessibilityState={{ disabled: active === 0 }}
          disabled={active === 0}
          onPress={onReset}
          pressedScale={0.94}
          style={styles.reset}>
          <Text variant="small" style={{ color: active ? '#FFFFFF' : theme.textMuted }}>
            Reset
          </Text>
        </Touchable>
      </View>

      <Section title="Category">
        <FilterPill
          label="All"
          selected={filters.categoryId === null}
          onPress={() => onChange({ categoryId: null })}
        />
        {categories?.map((category) => (
          <FilterPill
            key={category._id}
            label={category.name}
            selected={filters.categoryId === category._id}
            // Tapping the selected one clears it, matching the old chip row.
            onPress={() =>
              onChange({ categoryId: filters.categoryId === category._id ? null : category._id })
            }
          />
        ))}
      </Section>

      <Section title="When">
        {DATE_OPTIONS.map((option) => (
          <FilterPill
            key={option.id}
            label={option.label}
            selected={filters.dateRange === option.id}
            onPress={() => onChange({ dateRange: option.id })}
          />
        ))}
      </Section>

      <Section title="Sort by">
        {SORT_OPTIONS.map((option) => (
          <FilterPill
            key={option.id}
            label={option.label}
            selected={filters.sort === option.id}
            onPress={() => onChange({ sort: option.id })}
          />
        ))}
      </Section>

      <Button
        label={
          resultCount === 0
            ? 'No events match'
            : `Show ${resultCount} ${resultCount === 1 ? 'event' : 'events'}`
        }
        size="lg"
        onPress={onClose}
      />
    </BottomSheet>
  );
}

export const FilterSheet = memo(FilterSheetImpl);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  reset: { paddingVertical: Spacing.xs, paddingLeft: Spacing.md },
  section: { gap: Spacing.md, marginBottom: Spacing.xl },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
