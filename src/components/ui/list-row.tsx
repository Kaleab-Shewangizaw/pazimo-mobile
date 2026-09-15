import { Ionicons } from '@expo/vector-icons';
import { Children, Fragment, memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ListRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  /** Reddens the icon and label — the row acts on/removes something rather than opening a screen. */
  danger?: boolean;
};

/**
 * One row of icon + label (+ optional trailing value) + chevron, shared by
 * the profile card and every account-menu list screen so they read as one
 * consistent list style instead of each screen inventing its own.
 */
function ListRowImpl({ icon, label, value, onPress, danger }: ListRowProps) {
  const theme = useTheme();
  const color = danger ? theme.danger : theme.text;
  const iconColor = danger ? theme.danger : theme.textSecondary;

  const content = (
    <View style={styles.row}>
      <Ionicons name={icon} size={19} color={iconColor} />
      <Text variant="body" style={[styles.label, { color }]}>
        {label}
      </Text>
      {value ? (
        <Text variant="body" color="textSecondary" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.textMuted} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Touchable accessibilityRole="button" onPress={onPress} pressedScale={0.99}>
      {content}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg },
  label: { flex: 1 },
  value: { maxWidth: '52%', textAlign: 'right' },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: Spacing.lg,
  },
  divider: { height: StyleSheet.hairlineWidth },
});

export const ListRow = memo(ListRowImpl);

/** The glass-bordered card `ListRow`s sit in, with a hairline divider auto-inserted between children. */
function ListCardImpl({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.card, { borderColor: theme.glassBorder }]}>
      {items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.hairline }]} /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

export const ListCard = memo(ListCardImpl);
