import type { ShareUser, TicketShare } from '@/types/api';

/**
 * Groups the flat ticket-share history into one row per counterparty —
 * "conversation(A,B)" is just `fromUser`/`toUser` collapsed to whichever id
 * isn't mine, so it's a client-side derivation, not a new backend concept.
 * Real-time comes along for free: this only ever runs over data that
 * `use-ticket-transfer-socket.ts` already keeps fresh.
 */

export type ShareConversation = {
  counterpartyId: string;
  /** Taken from the most recent share — good enough since a name/handle rarely changes mid-history. */
  counterparty: ShareUser;
  /** Chronological ascending by `createdAt` — the timeline order. */
  shares: TicketShare[];
  /** max(createdAt, respondedAt ?? createdAt) across every share in the group. */
  lastActivityAt: string;
  preview: { text: string; sentByMe: boolean };
  /** Something of theirs is still waiting on my response. */
  hasPendingIncoming: boolean;
};

function activityTime(share: TicketShare): number {
  const created = new Date(share.createdAt).getTime();
  const responded = share.respondedAt ? new Date(share.respondedAt).getTime() : created;
  return Math.max(created, responded);
}

function previewFor(share: TicketShare, sentByMe: boolean): string {
  return sentByMe ? '🎟️ Ticket transferred' : '🎟️ Ticket received';
}

export function groupSharesByCounterparty(
  shares: TicketShare[],
  myId: string | undefined,
): ShareConversation[] {
  if (!myId) return [];

  type Building = {
    counterpartyId: string;
    counterparty: ShareUser;
    shares: TicketShare[];
    lastActivityAt: number;
    previewShareActivity: number;
    previewShare: TicketShare;
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
    }))
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
}
