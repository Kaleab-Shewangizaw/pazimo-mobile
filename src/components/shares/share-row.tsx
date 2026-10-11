import { memo, useMemo } from 'react';
import { StyleSheet, Text as RNText, View, type ViewStyle } from 'react-native';

import { InviteMessageCard } from '@/components/shares/invite-message-card';
import { LinkPreviewCard } from '@/components/shares/link-preview-card';
import { TransferCard } from '@/components/shares/transfer-card';
import { Text } from '@/components/ui/text';
import { Touchable } from '@/components/ui/pressable';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { relativeTimeLabel } from '@/lib/date';
import { inviteChatPreview, parseInviteLink, type ParsedInvite } from '@/lib/invite-link';
import { linkify, openLink, type LinkSegment } from '@/lib/linkify';
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
  /** MESSAGE only — the item above/below is a message from the same person, so this bubble joins their run (tighter spacing, pinched corners, tail only on the last). */
  groupedWithPrev?: boolean;
  groupedWithNext?: boolean;
};

/**
 * One entry in the chat-like history: bubbles sit right (mine, blue) or
 * left (theirs, graphite) — color and side alone say who sent it, same idea as a messaging app even though this is a flat list
 * rather than a live back-and-forth. Every transfer kind renders through the
 * same `TransferCard`, which reads only `.lines`/`.art` — already reduced to
 * on-screen copy by whichever `to*ViewModel` builder produced this share.
 */
function ShareRowImpl({
  share,
  onPress,
  onLongPressMessage,
  groupedWithPrev = false,
  groupedWithNext = false,
}: ShareRowProps) {
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
    return (
      <MessageBubble
        share={share}
        myId={myId}
        onLongPress={onLongPressMessage}
        groupedWithPrev={groupedWithPrev}
        groupedWithNext={groupedWithNext}
      />
    );
  }

  const sent = share.fromUser._id === myId;
  const otherUser = sent ? share.toUser : share.fromUser;
  const otherName =
    [otherUser.firstName, otherUser.lastName].filter(Boolean).join(' ').trim() ||
    (otherUser.username ? `@${otherUser.username}` : 'Pazimo user');

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${sent ? 'Sent to' : 'Received from'} ${otherName}. ${title}. ${detail}. ${STATUS_LABEL[share.status]}`}
      onPress={() => onPress(share)}
      pressedScale={0.98}
      style={[styles.row, sent ? styles.rowSent : styles.rowReceived]}>
      <View style={styles.transferWrap}>
        <TransferCard share={share} sent={sent} title={title} detail={detail} />
      </View>
    </Touchable>
  );
}

/** The link a message unfurls: the first Pazimo invite if there is one, else the first web link. */
function cardLinkOf(segments: LinkSegment[]): { invite: ParsedInvite | null; previewUrl?: string } {
  let previewUrl: string | undefined;
  for (const segment of segments) {
    if (segment.type !== 'url') continue;
    const invite = parseInviteLink(segment.href);
    if (invite) return { invite };
    if (!previewUrl && /^https?:\/\//i.test(segment.href)) previewUrl = segment.href;
  }
  return { invite: null, previewUrl };
}

function MessageBubble({
  share,
  myId,
  onLongPress,
  groupedWithPrev,
  groupedWithNext,
}: {
  share: ShareItemViewModel;
  myId: string | undefined;
  onLongPress?: (share: ShareItemViewModel) => void;
  groupedWithPrev: boolean;
  groupedWithNext: boolean;
}) {
  const theme = useTheme();
  const sent = share.fromUser._id === myId;
  const otherUser = sent ? share.toUser : share.fromUser;
  const otherName =
    [otherUser.firstName, otherUser.lastName].filter(Boolean).join(' ').trim() ||
    (otherUser.username ? `@${otherUser.username}` : 'Pazimo user');

  // Only the sender can edit/delete their own message.
  const actionable = sent && Boolean(onLongPress);

  const text = share.message ?? '';
  const segments = useMemo(() => linkify(text), [text]);

  // An invite (movie/event/venue) rides as a plain message whose text is a
  // deep link or pazimo.com URL — see `lib/invite-link.ts`. A message that's
  // nothing *but* that link renders as the rich card alone; one with other
  // text around it keeps its text bubble and gets the card underneath, the
  // way other apps unfurl a link preview.
  //
  // Any other web link gets the usual unfurled preview instead (page image,
  // title, YouTube thumbnail) — only the first one, like other apps.
  const { invite, previewUrl } = cardLinkOf(segments);
  const inviteOnly = Boolean(invite) && segments.length === 1;

  // Telegram-style grouping: consecutive messages from the same side share a
  // pinched inner corner, and only the last one in a run gets the tail.
  const tight = 6;
  const shape: ViewStyle = sent
    ? {
        borderTopRightRadius: groupedWithPrev ? tight : Radius.lg,
        borderBottomRightRadius: groupedWithNext ? tight : 4,
      }
    : {
        borderTopLeftRadius: groupedWithPrev ? tight : Radius.lg,
        borderBottomLeftRadius: groupedWithNext ? tight : 4,
      };

  const textColor = sent ? theme.onBubbleSent : theme.text;
  const metaColor = sent ? theme.bubbleSentMeta : theme.textMuted;
  const linkColor = sent ? theme.linkOnBubbleSent : theme.link;

  const textBubble = inviteOnly ? null : (
    <View
      style={[
        styles.messageBubble,
        shape,
        sent
          ? { backgroundColor: theme.bubbleSent }
          : { backgroundColor: theme.bubbleReceived, borderColor: theme.hairline, borderWidth: StyleSheet.hairlineWidth },
      ]}>
      <Text variant="body" style={{ color: textColor }}>
        {segments.map((segment, i) =>
          segment.type === 'text' ? (
            segment.text
          ) : (
            <RNText
              key={i}
              accessibilityRole="link"
              onPress={() => openLink(segment.href)}
              suppressHighlighting={false}
              style={[styles.link, { color: linkColor, textDecorationColor: linkColor }]}>
              {segment.text}
            </RNText>
          ),
        )}
      </Text>
      <View style={styles.messageFooter}>
        {share.editedAt ? (
          <Text variant="caption" style={{ color: metaColor }}>
            edited
          </Text>
        ) : null}
        <Text variant="caption" style={[styles.messageTime, { color: metaColor }]}>
          {relativeTimeLabel(share.createdAt)}
        </Text>
      </View>
    </View>
  );

  const bubble = (
    <View style={[styles.messageStack, sent ? styles.stackSent : styles.stackReceived]}>
      {textBubble}
      {invite ? (
        <View style={styles.inviteWrap}>
          <InviteMessageCard kind={invite.kind} id={invite.id} openShowtimes={invite.openShowtimes} sent={sent} />
        </View>
      ) : previewUrl ? (
        <View style={styles.inviteWrap}>
          <LinkPreviewCard url={previewUrl} sent={sent} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View
      accessibilityLabel={`${sent ? 'You' : otherName}: ${inviteOnly && invite ? inviteChatPreview(invite.kind) : text}`}
      style={[
        styles.row,
        sent ? styles.rowSent : styles.rowReceived,
        groupedWithPrev && styles.rowGrouped,
      ]}>
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
  row: { paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
  rowReceived: { alignItems: 'flex-start' },
  rowSent: { alignItems: 'flex-end' },
  // Consecutive messages from the same person sit close together, so a run
  // reads as one block and the gap marks a change of speaker.
  rowGrouped: { marginTop: 2 },
  // Fixed rather than content-sized, so a thread of transfers stacks as a
  // tidy column of equal-width stubs whatever each one's title length.
  transferWrap: { width: '78%' },
  // A percentage `maxWidth` needs a determinate-width parent to resolve
  // against — `row` qualifies, but the sent path's `Touchable` (an otherwise
  // unstyled wrapper) doesn't, so the constraint has to live here, on
  // whichever element is `row`'s direct child in both branches, rather than
  // on `messageBubble` itself (which sits one level deeper for sent
  // messages). Without it, a long sent message renders as one unwrapped
  // line that overflows off-screen instead of wrapping.
  messageBubbleWrap: { maxWidth: '80%', flexShrink: 1 },
  messageStack: { gap: 4 },
  stackSent: { alignItems: 'flex-end' },
  stackReceived: { alignItems: 'flex-start' },
  // The card keeps its poster width whatever the text bubble above it does.
  inviteWrap: { width: 260, maxWidth: '100%' },
  messageBubble: {
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingTop: Spacing.sm,
    paddingBottom: 6,
    gap: 2,
  },
  link: { textDecorationLine: 'underline' },
  messageTime: { alignSelf: 'flex-end' },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
});

export const ShareRow = memo(ShareRowImpl);
