import { memo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ChipVariant = 'solid' | 'glass' | 'muted';

function ChipImpl({
  label,
  variant = 'glass',
  style,
}: {
  label: string;
  variant?: ChipVariant;
  style?: ViewStyle;
}) {
  const theme = useTheme();

  const fill: ViewStyle =
    variant === 'solid'
      ? { backgroundColor: theme.brand }
      : variant === 'muted'
        ? { backgroundColor: theme.surfaceMuted }
        : {
            backgroundColor: 'rgba(10, 10, 12, 0.45)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.3)',
          };

  const textColor =
    variant === 'solid' ? theme.onBrand : variant === 'muted' ? theme.textSecondary : '#FFFFFF';

  return (
    <View style={[styles.chip, fill, style]}>
      <Text variant="label" style={{ color: textColor }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: Spacing.sm + 2, paddingVertical: 5, borderRadius: Radius.pill },
});

export const Chip = memo(ChipImpl);
