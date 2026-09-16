import type { ShareItemViewModel } from '@/lib/share-item-view-model';
import type { ShareUser } from '@/types/api';

/**
 * Groups the flat share history — tickets, drinks, and (eventually) cinema
 * items alike, already normalized to `ShareItemViewModel` — into one row per
 * counterparty. "conversation(A,B)" is just `fromUser`/`toUser` collapsed to
 * whichever id isn't mine, so it's a client-side derivation, not a new
 * backend concept. Real-time comes along for free: this only ever runs over
 * data the share-transfer socket bridge already keeps fresh.
 */

export type ShareConversation = {
  counterpartyId: string;
  /** Taken from the most recent share — good enough since a name/handle rarely changes mid-history. */
  counterparty: ShareUser;
  /** Chronological ascending by `createdAt` — the timeline order. */
  shares: ShareItemViewModel[];
  /** max(createdAt, respondedAt ?? createdAt) across every share in the group. */
  lastActivityAt: string;
  preview: { text: string; sentByMe: boolean };
  /** Something of theirs is still waiting on my response. */
  hasPendingIncoming: boolean;
  /** Unread text messages from them — always 0 here, since this is the share-only grouping; the Chats list fills in the real count from `ConversationSummary` instead. */
  unreadCount: number;
};

function activityTime(share: ShareItemViewModel): number {
  const created = new Date(share.createdAt).getTime();
  const responded = share.respondedAt ? new Date(share.respondedAt).getTime() : created;
  return Math.max(created, responded);
}

// Kept complete for every `ShareKind` even though the Chats list no longer
// calls `previewFor` for its own row text (that now comes straight from the
// server's `lastMessagePreview` — see `useConversationsList`) — this table
// still backs anything that groups raw `ShareItemViewModel[]` generically.
const PREVIEW_COPY: Record<ShareItemViewModel['kind'], { sent: string; received: string }> = {
  TICKET: { sent: '🎟️ Ticket transferred', received: '🎟️ Ticket received' },
  BEVERAGE: { sent: '🥤 Drink sent', received: '🥤 Drink received' },
  CINEMA_TICKET: { sent: '🎬 Cinema ticket transferred', received: '🎬 Cinema ticket received' },
  CINEMA_CONCESSION: { sent: '🍿 Snack sent', received: '🍿 Snack received' },
  MESSAGE: { sent: 'You', received: '' },
};

function previewFor(share: ShareItemViewModel, sentByMe: boolean): string {
  const copy = PREVIEW_COPY[share.kind];
  return sentByMe ? copy.sent : copy.received;
}

export function groupSharesByCounterparty(
  shares: ShareItemViewModel[],
  myId: string | undefined,
): ShareConversation[] {
  if (!myId) return [];

  type Building = {
    counterpartyId: string;
    counterparty: ShareUser;
    shares: ShareItemViewModel[];
    lastActivityAt: number;
    previewShareActivity: number;
    previewShare: ShareItemViewModel;
    previewSentByMe: boolean;
    hasPendingIncoming: boolean;
  };

  const byCounterparty = new Map<string, Building>();

  for (const share of shares) {
    const sentByMe = share.fromUser._id === myId;
    const counterparty = sentByMe ? share.toUser : share.fromUser;
    const counterpartyId = counterparty._id;
    const activity = activityTime(share);
    const pendingIncoming = !sentByMe && share.status === 'pending';

    const existing = byCounterparty.get(counterpartyId);
    if (!existing) {
      byCounterparty.set(counterpartyId, {
        counterpartyId,
        counterparty,
        shares: [share],
        lastActivityAt: activity,
        previewShareActivity: activity,
        previewShare: share,
        previewSentByMe: sentByMe,
        hasPendingIncoming: pendingIncoming,
      });
      continue;
    }

    existing.shares.push(share);
    existing.counterparty = counterparty;
    if (activity > existing.lastActivityAt) existing.lastActivityAt = activity;
    if (activity >= existing.previewShareActivity) {
      existing.previewShareActivity = activity;
      existing.previewShare = share;
      existing.previewSentByMe = sentByMe;
    }
    if (pendingIncoming) existing.hasPendingIncoming = true;
  }

  return [...byCounterparty.values()]
    .map((group) => ({
      counterpartyId: group.counterpartyId,
      counterparty: group.counterparty,
      shares: group.shares.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
      lastActivityAt: new Date(group.lastActivityAt).toISOString(),
      preview: {
        text: previewFor(group.previewShare, group.previewSentByMe),
        sentByMe: group.previewSentByMe,
      },
      hasPendingIncoming: group.hasPendingIncoming,
      unreadCount: 0,
    }))
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
}

/**
 * Which counterparties have a share (ticket/drink/cinema item) sent TO me
 * still awaiting my response — the Chats list's red-dot indicator. The list
 * itself is now backend-driven (`useConversationsList`), but "is anything of
 * theirs still pending" isn't a field the `Conversation` model tracks, so
 * this reads it straight off the three share hooks the thread screen already
 * fetches, the same way the old `hasPendingIncoming` on `ShareConversation`
 * did before the list moved off `groupSharesByCounterparty`.
 */
export function pendingIncomingCounterpartyIds(
  shares: ShareItemViewModel[],
  myId: string | undefined,
): Set<string> {
  const ids = new Set<string>();
  if (!myId) return ids;
  for (const share of shares) {
    if (share.status === 'pending' && share.toUser._id === myId) {
      ids.add(share.fromUser._id);
    }
  }
  return ids;
}
