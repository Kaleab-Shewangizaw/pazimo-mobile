import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AvatarInitials } from '@/components/shares/avatar-initials';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useContactCard, useSetContact } from '@/queries/messages';

export type ContactCardSheetProps = {
  counterpartyId: string;
  visible: boolean;
  onClose: () => void;
};

/**
 * What tapping a chat's header name opens. Username is always shown; a
 * phone number only appears once both people have added each other — the
 * server already decided that (see `contactService.getContactCard`), so
 * this never guesses at visibility itself, only renders what came back.
 */
function ContactCardSheetImpl({ counterpartyId, visible, onClose }: ContactCardSheetProps) {
  const theme = useTheme();
  const { card, isLoading } = useContactCard(visible ? counterpartyId : undefined);
  const { set, submitting } = useSetContact();

  const toggleContact = useCallback(() => {
    if (!card) return;
    set(counterpartyId, !card.isContact);
  }, [card, counterpartyId, set]);

  const name = card
    ? [card.firstName, card.lastName].filter(Boolean).join(' ').trim() || 'Pazimo user'
    : '';

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {isLoading || !card ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : (
        <View style={styles.container}>
          <View style={styles.header}>
            <AvatarInitials name={name} size={72} />
            <Text variant="title" style={styles.centered}>
              {name}
            </Text>
            {card.username ? (
              <Text variant="body" color="textSecondary">
                @{card.username}
              </Text>
            ) : null}
          </View>

          <View style={styles.details}>
            {card.phoneNumber ? (
              <DetailRow icon="call-outline" label="Phone" value={card.phoneNumber} />
            ) : (
              <View style={[styles.hint, { backgroundColor: theme.surfaceMuted }]}>
                <Ionicons name="lock-closed-outline" size={16} color={theme.textMuted} />
                <Text variant="small" color="textMuted" style={styles.hintText}>
                  Add each other as contacts to see phone numbers.
                </Text>
              </View>
            )}
          </View>

          <Button
            label={card.isContact ? 'Remove from Contacts' : 'Add to Contacts'}
            variant={card.isContact ? 'secondary' : 'primary'}
            loading={submitting}
            disabled={submitting}
            onPress={toggleContact}
          />
        </View>
      )}
    </BottomSheet>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: theme.brandTint }]}>
        <Ionicons name={icon} size={16} color={theme.text} />
      </View>
      <View style={styles.rowText}>
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
        <Text variant="body">{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  container: { gap: Spacing.lg },
  header: { alignItems: 'center', gap: Spacing.xs },
  centered: { textAlign: 'center' },
  details: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rowIcon: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 1 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  hintText: { flex: 1 },
});

export const ContactCardSheet = memo(ContactCardSheetImpl);
