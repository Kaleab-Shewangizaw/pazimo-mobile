import { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ShareRow } from '@/components/shares/share-row';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import type { ShareItemViewModel } from '@/lib/share-item-view-model';

export type SharedItemsSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Tickets/drinks/cinema items only — never a MESSAGE, this is what "sent together" means here. */
  items: ShareItemViewModel[];
  name: string;
  onSelectItem: (item: ShareItemViewModel) => void;
};

/** What the hamburger menu's "Shared items" opens — every ticket, drink, and cinema item ever sent between these two people, reusing the same `ShareRow` bubble the thread itself renders. */
function SharedItemsSheetImpl({ visible, onClose, items, name, onSelectItem }: SharedItemsSheetProps) {
  const select = (item: ShareItemViewModel) => {
    onClose();
    setTimeout(() => onSelectItem(item), 260);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text variant="title">Shared with {name}</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="body" color="textSecondary" style={styles.emptyText}>
            No tickets or drinks shared yet.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}>
          {items.map((item) => (
            <ShareRow key={`${item.kind}-${item.id}`} share={item} onPress={select} />
          ))}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: Spacing.md },
  list: { maxHeight: 420 },
  listContent: { gap: Spacing.sm },
  empty: { paddingVertical: Spacing.xl, alignItems: 'center' },
  emptyText: { textAlign: 'center' },
});

export const SharedItemsSheet = memo(SharedItemsSheetImpl);
