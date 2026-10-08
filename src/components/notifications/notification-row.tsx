import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { relativeTimeLabel } from '@/lib/date';
import type { AppNotification, AppNotificationKind } from '@/types/api';

const KIND_ICON: Record<AppNotificationKind, keyof typeof Ionicons.glyphMap> = {
  'ticket-share': 'ticket',
  'beverage-share': 'wine',
  'cinema-share': 'film',
  campaign: 'megaphone',
};

export type NotificationRowProps = {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
};

/** One inbox row — same row anatomy as the Chats list's `ConversationRow`, with an unread dot in place of a count. */
function NotificationRowImpl({ notification, onPress }: NotificationRowProps) {
  const theme = useTheme();
  const unread = !notification.readAt;

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${notification.title}. ${notification.body}`}
      onPress={() => onPress(notification)}
      pressedScale={0.98}
      style={[styles.row, unread && { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
      <View style={[styles.icon, { backgroundColor: unread ? theme.brandTint : theme.surfaceMuted }]}>
        <Ionicons name={KIND_ICON[notification.kind] ?? 'notifications'} size={20} color={theme.text} />
      </View>
      <View style={styles.body}>
        <View style={styles.line}>
          <Text variant="body" numberOfLines={1} style={[styles.title, unread && styles.titleUnread]}>
            {notification.title}
          </Text>
          <Text variant="caption" color={unread ? 'text' : 'textMuted'}>
            {relativeTimeLabel(notification.createdAt)}
          </Text>
        </View>
        {notification.body ? (
          <Text variant="small" color={unread ? 'text' : 'textSecondary'} numberOfLines={2}>
            {notification.body}
          </Text>
        ) : null}
      </View>
      {unread ? <View style={[styles.dot, { backgroundColor: theme.danger }]} /> : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { flex: 1 },
  titleUnread: { fontFamily: FontFamily.bold },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

export const NotificationRow = memo(NotificationRowImpl);
