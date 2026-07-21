import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function SectionHeaderImpl({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <Text variant="title">{title}</Text>
      {actionLabel && onAction ? (
        <Touchable
          accessibilityRole="button"
          onPress={onAction}
          pressedScale={0.94}
          style={styles.action}>
          <Text variant="small" color="brand">
            {actionLabel}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.brand} />
        </Touchable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});

export const SectionHeader = memo(SectionHeaderImpl);
