import { resolveImageUrl } from '@/lib/media';
import type { BeverageShare, CinemaShare, Message, ShareUser, ShareStatus, TicketShare } from '@/types/api';

/**
 * The one normalized shape the chat UI (`ShareRow`, `ShareDetailSheet`,
 * `conversations.ts`) renders — so those files never need to know which of
 * the five sources (`TicketShare`, `BeverageShare`, `CinemaShare` for either
 * item type, or a plain `Message`) a given entry came from. Each domain's
 * own field names (`item.ticket.event.title` vs `item.saleDetails.beverage.
 * name` vs `item.itemDetails.movieTitle`) are read exactly once, in the
 * builder functions below, and nowhere else.
 */

export type ShareKind = 'TICKET' | 'BEVERAGE' | 'CINEMA_TICKET' | 'CINEMA_CONCESSION' | 'MESSAGE';

export type ShareItemViewModelLine = {
  /** The underlying ticket/sale id — stable per line, used as a React key. */
  id: string;
  title: string;
  subtitle: string;
  quantity: number;
};

/**
 * What the chat's transfer card draws above and around the item's name —
 * read from the lead item only, the same one `ShareRow` titles the card with.
 */
export type ShareItemArt = {
  /** Cover art, when the share's payload carries one directly (a movie poster). */
  imageUrl?: string | null;
  /** An event ticket's payload carries no cover — the card fetches it by this id instead. */
  eventId?: string;
  /** A drink/snack's own swatch color, for cards with no artwork at all. */
  accentColor?: string | null;
  /** ISO start time — the event's date or the screening's. */
  startsAt?: string | null;
  place?: string | null;
};

export type ShareItemViewModel = {
  kind: ShareKind;
  /** The share document's own id — what accept/decline/cancel act on. */
  id: string;
  fromUser: ShareUser;
  toUser: ShareUser;
  status: ShareStatus;
  message?: string;
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;
  lines: ShareItemViewModelLine[];
  /** Absent for MESSAGE. */
  art?: ShareItemArt;
  /** MESSAGE only — carried through from the `Message` it was built from. */
  editedAt?: string | null;
};

/** A plain chat message, normalized just enough to sit in the same merged, sorted timeline as the transfer bubbles. `lines` is always empty — nothing here has a summary/quantity to show. */
export function messageToViewModel(msg: Message): ShareItemViewModel {
  return {
    kind: 'MESSAGE',
    id: msg._id,
    fromUser: msg.sender,
    toUser: msg.recipient,
    // Inert filler — a plain message is never accepted/declined/cancelled,
    // so `status` is never read for this kind (see ShareRow's early
    // MESSAGE branch, which renders straight from `.message` instead).
    status: 'accepted',
    message: msg.text,
    createdAt: msg.createdAt,
    respondedAt: null,
    expiresAt: msg.createdAt,
    lines: [],
    editedAt: msg.editedAt,
  };
}

export function ticketShareToViewModel(share: TicketShare): ShareItemViewModel {
  return {
    kind: 'TICKET',
    id: share._id,
    fromUser: share.fromUser,
    toUser: share.toUser,
    status: share.status,
    message: share.message,
    createdAt: share.createdAt,
    respondedAt: share.respondedAt,
    expiresAt: share.expiresAt,
    lines: share.items.map((item) => ({
      id: item.ticket._id,
      title: item.ticket.event.title,
      subtitle:
        item.transferType === 'FULL'
          ? `${item.ticket.ticketType} · entire ticket`
          : `${item.ticket.ticketType} · ${item.quantity} admission${item.quantity > 1 ? 's' : ''}`,
      quantity: item.quantity,
    })),
    art: share.items[0] && {
      eventId: share.items[0].ticket.event._id,
      startsAt: share.items[0].ticket.event.startDate,
      place:
        [share.items[0].ticket.event.location?.address, share.items[0].ticket.event.location?.city]
          .filter(Boolean)
          .join(', ') || null,
    },
  };
}

/** `attachItemDetails` populates one of two shapes depending on the share's own `itemType` — this reads the one that applies. */
export function cinemaShareToViewModel(share: CinemaShare): ShareItemViewModel {
  const isConcession = share.itemType === 'CINEMA_CONCESSION';
  return {
    kind: isConcession ? 'CINEMA_CONCESSION' : 'CINEMA_TICKET',
    id: share._id,
    fromUser: share.fromUser,
    toUser: share.toUser,
    status: share.status,
    message: share.message,
    createdAt: share.createdAt,
    respondedAt: share.respondedAt,
    expiresAt: share.expiresAt,
    lines: share.items.map((item) => {
      const details = item.itemDetails;
      const title = isConcession ? details?.beverageName || 'Snack' : details?.movieTitle || 'Cinema ticket';
      const subtitle = isConcession
        ? [details?.cinema?.name, item.quantity > 1 ? `×${item.quantity}` : null].filter(Boolean).join(' · ')
        : [details?.cinema?.name, details?.ticketType, item.quantity > 1 ? `${item.quantity} seats` : null]
            .filter(Boolean)
            .join(' · ');
      return {
        id: item.item,
        title,
        subtitle,
        quantity: item.quantity,
      };
    }),
    art: (() => {
      const lead = share.items[0]?.itemDetails;
      if (!lead) return undefined;
      return isConcession
        ? { accentColor: lead.beverageColor, place: lead.cinema?.name }
        : {
            imageUrl: resolveImageUrl(lead.movie?.poster),
            startsAt: lead.showtimeStartsAt,
            place: [lead.cinema?.name, lead.hallName].filter(Boolean).join(' · ') || null,
          };
    })(),
  };
}

export function beverageShareToViewModel(share: BeverageShare): ShareItemViewModel {
  return {
    kind: 'BEVERAGE',
    id: share._id,
    fromUser: share.fromUser,
    toUser: share.toUser,
    status: share.status,
    message: share.message,
    createdAt: share.createdAt,
    respondedAt: share.respondedAt,
    expiresAt: share.expiresAt,
    lines: share.items.map((item) => {
      const details = item.saleDetails;
      const place = details?.event?.title || details?.venue?.name;
      return {
        id: item.sale,
        title: details?.beverage?.name || 'Drink',
        subtitle: [place, item.quantity > 1 ? `×${item.quantity}` : null].filter(Boolean).join(' · '),
        quantity: item.quantity,
      };
    }),
    art: (() => {
      const lead = share.items[0]?.saleDetails;
      if (!lead) return undefined;
      return {
        accentColor: lead.beverage?.color,
        startsAt: lead.event?.startDate,
        place: lead.event?.title || lead.venue?.name,
      };
    })(),
  };
}
