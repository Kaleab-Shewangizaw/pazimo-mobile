import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ShareKind } from '@/lib/share-item-view-model';

const KIND_OPTIONS: { kind: ShareKind; icon: keyof typeof Ionicons.glyphMap; label: string; description: string }[] = [
  { kind: 'TICKET', icon: 'ticket-outline', label: 'Event ticket', description: 'Send a ticket you hold to an event' },
  { kind: 'BEVERAGE', icon: 'beer-outline', label: 'Drink', description: 'Send a drink you bought at an event or venue' },
  { kind: 'CINEMA_TICKET', icon: 'film-outline', label: 'Cinema ticket', description: 'Send a seat you booked at the cinema' },
  { kind: 'CINEMA_CONCESSION', icon: 'fast-food-outline', label: 'Cinema snack', description: 'Send a snack you bought at the cinema' },
];

export type KindPickerStepProps = {
  /** Restricts the list — e.g. an order-scoped entry point only offers what that order actually has. */
  allowedKinds?: ShareKind[];
  onSelect: (kind: ShareKind) => void;
};

/** Step 1 of the compose sheet when the caller hasn't already fixed what's being sent: what do you want to send? */
function KindPickerStepImpl({ allowedKinds, onSelect }: KindPickerStepProps) {
  const theme = useTheme();
  const options = allowedKinds
    ? KIND_OPTIONS.filter((o) => allowedKinds.includes(o.kind))
    : KIND_OPTIONS;

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <Touchable
          key={option.kind}
          accessibilityRole="button"
          accessibilityLabel={option.label}
          onPress={() => onSelect(option.kind)}
          pressedScale={0.98}
          style={[styles.row, { borderColor: theme.hairline }]}>
          <View style={[styles.icon, { backgroundColor: theme.brandTint }]}>
            <Ionicons name={option.icon} size={20} color={theme.text} />
          </View>
          <View style={styles.text}>
            <Text variant="body">{option.label}</Text>
            <Text variant="caption" color="textSecondary">
              {option.description}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </Touchable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  icon: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});

export const KindPickerStep = memo(KindPickerStepImpl);
