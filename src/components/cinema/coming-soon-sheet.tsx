import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ComingSoonDay } from '@/lib/programme';

/**
 * The "Coming Soon" tab's picker: a plain list of the individual dates a
 * cinema has actually published beyond tomorrow, not a calendar grid — a
 * cinema's plan is a handful of dates, often fewer than a week, so a grid
 * would mostly show blanks nobody can tap.
 */

export type ComingSoonSheetProps = {
  visible: boolean;
  onClose: () => void;
  days: ComingSoonDay[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
};

function ComingSoonSheetImpl({ visible, onClose, days, selectedDate, onSelect }: ComingSoonSheetProps) {
  const theme = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text variant="title" style={styles.headerTitle}>
          Coming soon
        </Text>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          pressedScale={0.9}
          style={[styles.headerButton, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons name="close" size={18} color={theme.text} />
        </Touchable>
      </View>

      {days.length === 0 ? (
        <Text variant="small" color="textSecondary" style={styles.empty}>
          Nothing scheduled beyond tomorrow yet.
        </Text>
      ) : (
        <View style={styles.rows}>
          {days.map((day) => (
            <DateRow
              key={day.date}
              day={day}
              selected={day.date === selectedDate}
              onPress={() => onSelect(day.date)}
            />
          ))}
        </View>
      )}
    </BottomSheet>
  );
}

function DateRow({
  day,
  selected,
  onPress,
}: {
  day: ComingSoonDay;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Touchable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      haptic
      pressedScale={0.98}
      style={[
        styles.row,
        {
          backgroundColor: selected ? theme.brandTint : theme.surface,
          borderColor: selected ? 'rgba(255,255,255,0.85)' : theme.hairline,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}>
      <View style={styles.rowMain}>
        <Text variant="callout">{day.label}</Text>
        <Text variant="caption" color="textMuted">
          {day.entries.length} {day.entries.length === 1 ? 'film' : 'films'}
        </Text>
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={selected ? theme.brand : theme.textMuted}
      />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerTitle: { flex: 1 },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  empty: { paddingVertical: Spacing.lg, textAlign: 'center' },

  rows: { gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  rowMain: { gap: 2 },
});

export const ComingSoonSheet = memo(ComingSoonSheetImpl);
