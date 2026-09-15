import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MessageOptionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** What long-pressing your own message opens — Edit or Delete, nothing else yet. */
function MessageOptionsSheetImpl({ visible, onClose, onEdit, onDelete }: MessageOptionsSheetProps) {
  const theme = useTheme();

  const close = (after: () => void) => {
    onClose();
    setTimeout(after, 260);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Edit message"
          onPress={() => close(onEdit)}
          pressedScale={0.98}
          style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: theme.brandTint }]}>
            <Ionicons name="create-outline" size={18} color={theme.text} />
          </View>
          <Text variant="body">Edit</Text>
        </Touchable>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Delete message"
          onPress={() => close(onDelete)}
          pressedScale={0.98}
          style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: 'rgba(251,113,133,0.12)' }]}>
            <Ionicons name="trash-outline" size={18} color={theme.danger} />
          </View>
          <Text variant="body" style={{ color: theme.danger }}>
            Delete
          </Text>
        </Touchable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  rowIcon: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});

export const MessageOptionsSheet = memo(MessageOptionsSheetImpl);
