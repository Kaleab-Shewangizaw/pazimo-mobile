import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AvatarInitials } from '@/components/shares/avatar-initials';
import { Text } from '@/components/ui/text';
import { Touchable } from '@/components/ui/pressable';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { relativeTimeLabel } from '@/lib/date';
import type { ShareItemViewModel } from '@/lib/share-item-view-model';
import { useAuthStore } from '@/stores/use-auth-store';
import type { ShareStatus } from '@/types/api';

const STATUS_LABEL: Record<ShareStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export type ShareRowProps = {
  share: ShareItemViewModel;
  onPress: (share: ShareItemViewModel) => void;
  /** MESSAGE only — long-pressing your own message opens its edit/delete options. */
  onLongPressMessage?: (share: ShareItemViewModel) => void;
};

/**
 * One entry in the chat-like history: avatar and bubble swap sides for sent
 * vs received, same idea as a messaging app even though this is a flat list
 * rather than a live back-and-forth. Renders any share kind identically —
 * all it reads is `.lines`, already reduced to on-screen copy by whichever
 * `to*ViewModel` builder produced this share.
 */
function ShareRowImpl({ share, onPress, onLongPressMessage }: ShareRowProps) {
  const theme = useTheme();
  const myId = useAuthStore((s) => s.user?._id);

  // Computed unconditionally (before the MESSAGE early return below) so
  // every hook in this component runs on every render regardless of kind —
  // harmless for MESSAGE, whose `lines` is always empty.
  const summary = useMemo(() => {
    const lead = share.lines[0];
    if (!lead) return '';
    return share.lines.length > 1 ? `${lead.title} · ${share.lines.length} items` : lead.title;
  }, [share.lines]);

  // A plain message has nothing to accept/decline/cancel and nothing but its
  // own text to show — no summary line, no status chip, and (unlike every
  // other kind) not tappable, so it renders as its own small component
  // rather than adding branches throughout the transfer-bubble layout below.
  if (share.kind === 'MESSAGE') {
    return <MessageBubble share={share} myId={myId} onLongPress={onLongPressMessage} />;
  }

  const sent = share.fromUser._id === myId;
  const otherUser = sent ? share.toUser : share.fromUser;
  const otherName =
    [otherUser.firstName, otherUser.lastName].filter(Boolean).join(' ').trim() ||
    (otherUser.username ? `@${otherUser.username}` : 'Pazimo user');

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
      accessibilityLabel={`${sent ? 'Sent to' : 'Received from'} ${otherName}. ${summary}. ${STATUS_LABEL[share.status]}`}
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
          {summary}
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

function MessageBubble({
  share,
  myId,
  onLongPress,
}: {
  share: ShareItemViewModel;
  myId: string | undefined;
  onLongPress?: (share: ShareItemViewModel) => void;
}) {
  const theme = useTheme();
  const sent = share.fromUser._id === myId;
  const otherUser = sent ? share.toUser : share.fromUser;
  const otherName =
    [otherUser.firstName, otherUser.lastName].filter(Boolean).join(' ').trim() ||
    (otherUser.username ? `@${otherUser.username}` : 'Pazimo user');

  // Only the sender can edit/delete their own message.
  const actionable = sent && Boolean(onLongPress);

  const bubble = (
    <View
      style={[
        styles.messageBubble,
        { backgroundColor: sent ? theme.brandTint : theme.surfaceMuted, borderColor: theme.hairline },
      ]}>
      <Text variant="body">{share.message}</Text>
      <View style={styles.messageFooter}>
        {share.editedAt ? (
          <Text variant="caption" color="textMuted">
            edited
          </Text>
        ) : null}
        <Text variant="caption" color="textMuted" style={styles.messageTime}>
          {relativeTimeLabel(share.createdAt)}
        </Text>
      </View>
    </View>
  );

  return (
    <View
      accessibilityLabel={`${sent ? 'You' : otherName}: ${share.message}`}
      style={[styles.row, sent ? styles.rowSent : styles.rowReceived]}>
      <AvatarInitials name={otherName} size={40} />
      {actionable ? (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Message options"
          onLongPress={() => onLongPress?.(share)}
          delayLongPress={300}
          pressedScale={0.98}
          style={styles.messageBubbleWrap}>
          {bubble}
        </Touchable>
      ) : (
        <View style={styles.messageBubbleWrap}>{bubble}</View>
      )}
    </View>
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
  // A percentage `maxWidth` needs a determinate-width parent to resolve
  // against — `row` qualifies, but the sent path's `Touchable` (an otherwise
  // unstyled wrapper) doesn't, so the constraint has to live here, on
  // whichever element is `row`'s direct child in both branches, rather than
  // on `messageBubble` itself (which sits one level deeper for sent
  // messages). Without it, a long sent message renders as one unwrapped
  // line that overflows off-screen instead of wrapping.
  messageBubbleWrap: { maxWidth: '78%', flexShrink: 1 },
  messageBubble: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  messageTime: { alignSelf: 'flex-end' },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
});

export const ShareRow = memo(ShareRowImpl);
