import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { RecipientStep } from '@/components/shares/recipient-step';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import type { ShareUser } from '@/types/api';

export type NewChatSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (person: ShareUser) => void;
};

/** The Chats list's entry point for opening someone with no shared history yet — same exact-match search as the ticket-attach flow. */
export function NewChatSheet({ visible, onClose, onSelect }: NewChatSheetProps) {
  const handleSelect = useCallback(
    (person: ShareUser) => {
      onClose();
      onSelect(person);
    },
    [onClose, onSelect],
  );

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text variant="title">New chat</Text>
        <RecipientStep onSelect={handleSelect} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
});
