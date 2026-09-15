import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ChatMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** The header's own name-tap does the same thing — this is the second way in. */
  onViewContact: () => void;
  /** Every ticket/drink/cinema item ever sent between these two — plain messages aren't shown here. */
  onViewSharedItems: () => void;
  /** Parent owns the confirmation dialog (blocking is consequential) and the actual mutation. */
  onBlock: () => void;
  /** Parent owns the confirmation dialog and the actual mutation — same shape as `onBlock`. Clears this account's own view of the message thread only; the other person's copy, and any ticket/drink/cinema history, are untouched. */
  onDeleteChat: () => void;
  otherName: string;
};

/**
 * The chat's hamburger menu. Block is real — wired to the same
 * `Contact`/`Block` backend the account menu's Blocked-accounts screen uses.
 * Report stays a placeholder on purpose: there's no report queue behind it
 * yet. The entry exists now so the menu doesn't need reshaping later when
 * that's built.
 */
function ChatMenuSheetImpl({
  visible,
  onClose,
  onViewContact,
  onViewSharedItems,
  onBlock,
  onDeleteChat,
  otherName,
}: ChatMenuSheetProps) {
  const close = (after?: () => void) => {
    onClose();
    if (after) setTimeout(after, 260);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <MenuRow
          icon="person-circle-outline"
          label="View contact"
          onPress={() => close(onViewContact)}
        />
        <MenuRow
          icon="albums-outline"
          label="Shared items"
          onPress={() => close(onViewSharedItems)}
        />
        <MenuRow
          icon="trash-outline"
          label="Delete chat"
          danger
          onPress={() => close(onDeleteChat)}
        />
        <MenuRow
          icon="ban-outline"
          label={`Block ${otherName}`}
          danger
          onPress={() => close(onBlock)}
        />
        <MenuRow
          icon="flag-outline"
          label="Report"
          danger
          onPress={() =>
            close(() =>
              Alert.alert('Not available yet', 'Reporting isn’t supported yet, but it’s coming.'),
            )
          }
        />
      </View>
    </BottomSheet>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();
  const color = danger ? theme.danger : theme.text;

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      pressedScale={0.98}
      style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? 'rgba(251,113,133,0.12)' : theme.brandTint }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text variant="body" style={{ color }}>
        {label}
      </Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  rowIcon: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});

export const ChatMenuSheet = memo(ChatMenuSheetImpl);
