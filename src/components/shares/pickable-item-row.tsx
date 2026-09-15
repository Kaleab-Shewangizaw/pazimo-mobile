import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Stepper } from '@/components/ui/stepper';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PickableItemRowProps = {
  title: string;
  subtitle: string;
  selected: boolean;
  onToggle: () => void;
  /** Omit for a checkbox-only row — a kind that only ever sends everything, never a partial quantity. */
  stepper?: {
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    hint: string;
  };
};

/**
 * One row in any "what do you want to send" picker — a checkbox toggle, an
 * optional quantity stepper underneath once selected. `ComposeStep`'s
 * ticket-specific `TicketRow` is the original of this shape; the drink
 * (and later cinema) pickers reuse it directly with `stepper` omitted, since
 * those kinds only ever send the full quantity.
 */
function PickableItemRowImpl({ title, subtitle, selected, onToggle, stepper }: PickableItemRowProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { borderColor: selected ? theme.brand : theme.hairline }]}>
      <Touchable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={title}
        onPress={onToggle}
        pressedScale={0.98}
        style={styles.main}>
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={20}
          color={selected ? theme.brand : theme.textMuted}
        />
        <View style={styles.text}>
          <Text variant="body" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Touchable>

      {selected && stepper ? (
        <View style={styles.stepperRow}>
          <Stepper
            value={stepper.value}
            min={stepper.min}
            max={stepper.max}
            onChange={stepper.onChange}
            accessibilityLabel={title}
          />
          <Text variant="caption" color="textSecondary">
            {stepper.hint}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  text: { flex: 1, gap: 2 },
  stepperRow: { gap: Spacing.xs, paddingLeft: 32 },
});

export const PickableItemRow = memo(PickableItemRowImpl);
