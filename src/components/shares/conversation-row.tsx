import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AvatarInitials } from '@/components/shares/avatar-initials';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { relativeTimeLabel } from '@/lib/date';
import type { ShareConversation } from '@/lib/conversations';

export type ConversationRowProps = {
  conversation: ShareConversation;
  onPress: (conversation: ShareConversation) => void;
};

/** One person, one row — a normal chat-list row, not a bubble (that's `ShareRow`, used inside the conversation itself). */
function ConversationRowImpl({ conversation, onPress }: ConversationRowProps) {
  const theme = useTheme();
  const { counterparty, preview, lastActivityAt, hasPendingIncoming, unreadCount } = conversation;

  const name =
    [counterparty.firstName, counterparty.lastName].filter(Boolean).join(' ').trim() ||
    (counterparty.username ? `@${counterparty.username}` : 'Pazimo user');

  const unreadLabel = unreadCount > 0 ? `, ${unreadCount} unread` : '';

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${preview.text}${unreadLabel}`}
      onPress={() => onPress(conversation)}
      pressedScale={0.98}
      style={styles.row}>
      <AvatarInitials name={name} size={48} />
      <View style={styles.body}>
        <View style={styles.line}>
          <Text
            variant="body"
            numberOfLines={1}
            style={[styles.name, unreadCount > 0 && styles.nameUnread]}>
            {name}
          </Text>
          <Text variant="caption" color={unreadCount > 0 ? 'text' : 'textMuted'}>
            {relativeTimeLabel(lastActivityAt)}
          </Text>
        </View>
        <View style={styles.line}>
          <Text
            variant="small"
            color={unreadCount > 0 ? 'text' : 'textSecondary'}
            numberOfLines={1}
            style={styles.preview}>
            {preview.sentByMe ? `You: ${preview.text}` : preview.text}
          </Text>
          {hasPendingIncoming ? (
            <View style={[styles.dot, { backgroundColor: theme.brand }]} />
          ) : null}
          {/* Telegram-style unread badge — a plain circle for 1-9, a wider pill past that rather than truncating to an unreadable single digit. */}
          {unreadCount > 0 ? (
            <View style={[styles.unreadBadge, { backgroundColor: theme.brand }]}>
              <Text variant="caption" style={[styles.unreadText, { color: theme.onBrand }]}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  body: { flex: 1, gap: 3 },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { flex: 1 },
  nameUnread: { fontFamily: FontFamily.bold },
  preview: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { lineHeight: 14 },
});

export const ConversationRow = memo(ConversationRowImpl);
