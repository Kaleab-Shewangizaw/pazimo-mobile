import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';

export type StepperProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  accessibilityLabel?: string;
};

function StepperImpl({ value, min = 0, max, onChange, accessibilityLabel = 'quantity' }: StepperProps) {
  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <View style={styles.stepper}>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={`Remove one ${accessibilityLabel}`}
        disabled={!canDecrement}
        onPress={() => onChange(value - 1)}
        haptic
        pressedScale={0.88}
        style={[styles.button, !canDecrement && styles.disabled]}>
        <Ionicons name="remove" size={16} color="#FFFFFF" />
      </Touchable>
      <Text
        variant="callout"
        style={styles.value}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${value} ${accessibilityLabel}`}>
        {value}
      </Text>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={`Add one ${accessibilityLabel}`}
        disabled={!canIncrement}
        onPress={() => onChange(value + 1)}
        haptic
        pressedScale={0.88}
        style={[styles.button, !canIncrement && styles.disabled]}>
        <Ionicons name="add" size={16} color="#FFFFFF" />
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  button: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  disabled: { opacity: 0.35 },
  value: { minWidth: 22, textAlign: 'center', fontVariant: ['tabular-nums'] },
});

export const Stepper = memo(StepperImpl);
