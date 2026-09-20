import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AvatarInitials } from '@/components/shares/avatar-initials';
import { InviteMessageCard } from '@/components/shares/invite-message-card';
import { Text } from '@/components/ui/text';
import { Touchable } from '@/components/ui/pressable';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { relativeTimeLabel } from '@/lib/date';
import { inviteChatPreview, parseInviteLink } from '@/lib/invite-link';
import type { ShareItemViewModel, ShareKind } from '@/lib/share-item-view-model';
import { useAuthStore } from '@/stores/use-auth-store';
import type { ShareStatus } from '@/types/api';

const STATUS_LABEL: Record<ShareStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

/** Same wording as the compose sheet's kind picker (`kind-picker-step.tsx`) — this is the eyebrow over the item's own name, not a fresh vocabulary for it. */
const KIND_LABEL: Record<ShareKind, string> = {
  TICKET: 'Event ticket',
  BEVERAGE: 'Drink',
  CINEMA_TICKET: 'Cinema ticket',
  CINEMA_CONCESSION: 'Cinema snack',
  MESSAGE: 'Message',
};

/** Translucent wash of each status color, same 12%-alpha convention as the danger icon fills in `chat-menu-sheet.tsx`. */
const STATUS_TINT: Record<ShareStatus, string> = {
  pending: 'rgba(255, 255, 255, 0.12)',
  accepted: 'rgba(52, 211, 153, 0.12)',
  declined: 'rgba(251, 113, 133, 0.12)',
  cancelled: 'rgba(251, 113, 133, 0.12)',
  expired: 'rgba(107, 107, 118, 0.12)',
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
  const { title, detail } = useMemo(() => {
    const lead = share.lines[0];
    if (!lead) return { title: '', detail: '' };
    const multiple = share.lines.length > 1;
    return {
      title: multiple ? `${lead.title} · ${share.lines.length} items` : lead.title,
      detail: lead.subtitle,
    };
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
      accessibilityLabel={`${sent ? 'Sent to' : 'Received from'} ${otherName}. ${title}. ${detail}. ${STATUS_LABEL[share.status]}`}
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
          <Text variant="label" color="textSecondary" style={styles.eyebrow}>
            {KIND_LABEL[share.kind]}
          </Text>
          <Text variant="caption" color="textMuted">
            {relativeTimeLabel(share.createdAt)}
          </Text>
        </View>
        <Text variant="callout" numberOfLines={1} style={styles.itemTitle}>
          {title}
        </Text>
        {detail ? (
          <Text variant="small" color="textSecondary" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
        {share.message ? (
          <Text variant="body" numberOfLines={2} style={[styles.message, { borderTopColor: theme.hairline }]}>
            {share.message}
          </Text>
        ) : null}
        <View style={[styles.statusChip, { backgroundColor: STATUS_TINT[share.status] }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
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

  // An invite (movie/event/venue) rides as a plain message whose text is a
  // deep link — see `lib/invite-link.ts`. Detected here so it renders as a
  // rich card instead of raw link text.
  const invite = share.message ? parseInviteLink(share.message) : null;

  const bubble = invite ? (
    <InviteMessageCard kind={invite.kind} id={invite.id} openShowtimes={invite.openShowtimes} sent={sent} />
  ) : (
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
      accessibilityLabel={`${sent ? 'You' : otherName}: ${invite ? inviteChatPreview(invite.kind) : share.message}`}
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
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: 4,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  eyebrow: { flexShrink: 1 },
  itemTitle: { marginTop: 2 },
  message: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
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
