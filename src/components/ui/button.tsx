import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Touchable, type TouchableProps } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonProps = Omit<TouchableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
};

function ButtonImpl({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const background =
    variant === 'primary' ? theme.brand : variant === 'secondary' ? theme.brandTint : 'transparent';
  const foreground = variant === 'primary' ? theme.onBrand : theme.brand;

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      haptic={variant === 'primary'}
      style={[
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: background, opacity: isDisabled ? 0.5 : 1 },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text variant="callout" style={{ color: foreground }}>
            {label}
          </Text>
        </View>
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});

export const Button = memo(ButtonImpl);
