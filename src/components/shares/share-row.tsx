import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AvatarInitials } from '@/components/shares/avatar-initials';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { relativeTimeLabel } from '@/lib/date';
import { useAuthStore } from '@/stores/use-auth-store';
import type { ShareStatus, TicketShare } from '@/types/api';

const STATUS_LABEL: Record<ShareStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export type ShareRowProps = {
  share: TicketShare;
  onPress: (share: TicketShare) => void;
};

/**
 * One entry in the chat-like history: avatar and bubble swap sides for sent
 * vs received, same idea as a messaging app even though this is a flat list
 * rather than a live back-and-forth.
 */
function ShareRowImpl({ share, onPress }: ShareRowProps) {
  const theme = useTheme();
  const myId = useAuthStore((s) => s.user?._id);

  const sent = share.fromUser._id === myId;
  const otherUser = sent ? share.toUser : share.fromUser;
  const otherName =
    [otherUser.firstName, otherUser.lastName].filter(Boolean).join(' ').trim() ||
    (otherUser.username ? `@${otherUser.username}` : 'Pazimo user');

  const ticketSummary = useMemo(() => {
    const lead = share.items[0];
    if (!lead) return '';
    if (share.items.length > 1) {
      return `${lead.ticket.event.title} · ${share.items.length} tickets`;
    }
    return lead.quantity > 1
      ? `${lead.ticket.event.title} · ${lead.quantity} admissions`
      : lead.ticket.event.title;
  }, [share.items]);

  // Pending borrows the app's existing "scarcity copy reads as white, not a
  // hue" convention (see `warning` in constants/theme.ts) rather than an
  // amber that would be the only warm color anywhere in this app.
  const statusColor =
    share.status === 'pending'
      ? theme.brand
      : share.status === 'accepted'
        ? theme.success
        : share.status === 'expired'
          ? theme.textMuted
          : theme.danger;

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${sent ? 'Sent to' : 'Received from'} ${otherName}. ${ticketSummary}. ${STATUS_LABEL[share.status]}`}
      onPress={() => onPress(share)}
      pressedScale={0.98}
      style={[styles.row, sent ? styles.rowSent : styles.rowReceived]}>
      <AvatarInitials name={otherName} size={40} />
      <View
        style={[
          styles.bubble,
          { backgroundColor: sent ? 'rgba(255,255,255,0.08)' : theme.surfaceMuted, borderColor: theme.hairline },
        ]}>
        <View style={styles.bubbleHeader}>
          <Text variant="callout" numberOfLines={1} style={styles.name}>
            {otherName}
          </Text>
          <Text variant="caption" color="textMuted">
            {relativeTimeLabel(share.createdAt)}
          </Text>
        </View>
        <Text variant="small" color="textSecondary" numberOfLines={1}>
          {ticketSummary}
        </Text>
        {share.message ? (
          <Text variant="body" numberOfLines={2} style={styles.message}>
            {share.message}
          </Text>
        ) : null}
        <View style={[styles.statusChip, { borderColor: statusColor }]}>
          <Text variant="caption" style={{ color: statusColor }}>
            {STATUS_LABEL[share.status]}
          </Text>
        </View>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  rowReceived: { flexDirection: 'row' },
  rowSent: { flexDirection: 'row-reverse' },
  bubble: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: 4,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  name: { flexShrink: 1 },
  message: { marginTop: 2 },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export const ShareRow = memo(ShareRowImpl);
