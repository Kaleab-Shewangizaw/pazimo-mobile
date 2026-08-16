import { getData, getKeyed } from '@/api/client';
import type { Ticket } from '@/types/api';

/**
 * `event` is a Mongo populate on both ticket reads, and a populate whose target
 * document is gone resolves to `null` rather than being omitted — a hard-deleted
 * event leaves its tickets behind pointing at nothing. The ticket is still the
 * thing that gets scanned at the door, so it is kept and given a stand-in event
 * instead of being dropped; every screen reads `ticket.event.title` and friends
 * unconditionally, which is what `Ticket['event']` promises them.
 */
const MISSING_EVENT: Ticket['event'] = {
  _id: '',
  title: 'Event unavailable',
  startDate: '',
};

/** Makes a ticket list match its declared type before it reaches the caches. */
function usable(tickets: Ticket[] | null | undefined): Ticket[] {
  return (tickets ?? [])
    .filter(Boolean)
    .map((ticket) => (ticket.event ? ticket : { ...ticket, event: MISSING_EVENT }));
}

/**
 * Every ticket the signed-in account owns. Bearer-only and unpaginated — the
 * server unions `user.tickets`, `ticket.user`, and guest tickets matched by the
 * account's email or phone, which is what lets a guest purchase show up here
 * once the buyer is signed in.
 *
 * Note the envelope: this route returns `{success, tickets, count}`, not the
 * `{data}` shape the rest of the API uses.
 */
export async function fetchMyTickets(): Promise<Ticket[]> {
  return usable(await getKeyed<Ticket[]>('/tickets/my-tickets', 'tickets'));
}

/**
 * The public lookup, and the only way a guest can reach their own ticket. The
 * `id` may be a `ticketId`, a Mongo `_id`, or the payment's `transactionId` —
 * the last is how a just-finished purchase finds the tickets it created before
 * it knows their ids.
 *
 * Returns every ticket sharing that reference, so a multi-ticket order comes
 * back as a list.
 */
export async function fetchPublicTickets(id: string): Promise<Ticket[]> {
  return usable(await getData<Ticket[]>(`/tickets/public/details/${id}`));
}
