import { useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { ApiError } from '@/api/client';
import { fetchEvent } from '@/api/events';
import { fetchMyTickets, fetchPublicTickets } from '@/api/tickets';
import { loadDeviceTicketIds } from '@/lib/device-tickets';
import { eventCoverUrl } from '@/lib/media';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';
import type { Ticket } from '@/types/api';

/** Tickets change rarely, and a stale QR is still a valid QR. */
const TICKET_STALE_TIME = 5 * 60 * 1000;

function useDeviceTicketIds() {
  const [ids, setIds] = useState<string[] | null>(null);

  useEffect(() => {
    let active = true;
    loadDeviceTicketIds().then((stored) => {
      if (active) setIds(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  return ids;
}

/**
 * Every ticket this person can see, from both sources at once.
 *
 * The account's own list is the real one, but it needs a session — so purchases
 * recorded on this device are fetched alongside it and merged. In the common
 * case (checkout signed the buyer in) the two overlap completely and the merge
 * is a no-op; the local ledger only shows through when there is no usable
 * session, which is exactly when the server list would otherwise be empty.
 */
export function useMyTickets() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const deviceIds = useDeviceTicketIds();

  const mine = useQuery({
    queryKey: queryKeys.tickets.mine(),
    queryFn: fetchMyTickets,
    enabled: hydrated && Boolean(token),
    staleTime: TICKET_STALE_TIME,
  });

  const local = useQueries({
    queries: (deviceIds ?? []).map((id) => ({
      queryKey: queryKeys.tickets.public(id),
      queryFn: () => fetchPublicTickets(id),
      staleTime: TICKET_STALE_TIME,
      // A ticket deleted server-side would 404 forever; don't keep asking.
      retry: false,
    })),
  });

  // `useQueries` hands back a new array identity every render, so the merge is
  // keyed on the data itself rather than on the result objects.
  const localTickets = local.flatMap((result) => result.data ?? []);
  const localKey = localTickets.map((ticket) => ticket._id).join(',');
  const serverTickets = mine.data;

  const tickets = useMemo(() => {
    const byId = new Map<string, Ticket>();
    // Server records win on conflict — they are the ones that reflect check-in.
    for (const ticket of localTickets) byId.set(ticket._id, ticket);
    for (const ticket of serverTickets ?? []) byId.set(ticket._id, ticket);
    return [...byId.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `localKey` is the stable identity of `localTickets`, which is rebuilt every render.
  }, [serverTickets, localKey]);

  const waitingOnDevice = deviceIds === null || local.some((result) => result.isLoading);

  return {
    tickets,
    isLoading: (mine.isLoading && Boolean(token)) || waitingOnDevice,
    // Losing the account list still leaves the device list, so this is only an
    // error state when nothing at all came back.
    isError: mine.isError && tickets.length === 0,
    error: mine.error instanceof ApiError ? mine.error : undefined,
    isSignedIn: Boolean(token),
    refetch: mine.refetch,
  };
}

/**
 * Cover art for a list of tickets, keyed by event id.
 *
 * `my-tickets` populates only `title startDate endDate location` on the event,
 * so a signed-in buyer's list arrives with no artwork at all — which is most of
 * what makes a row recognisable. The public ticket read *does* include covers,
 * so this only fills the gaps, and it fills them from the event cache the
 * detail screen already populates: opening an event and then its ticket costs
 * no extra request.
 */
export function useTicketCovers(tickets: Ticket[]): Record<string, string | null> {
  const missing = useMemo(() => {
    const ids = new Set<string>();
    for (const ticket of tickets) {
      if (ticket.event._id && !ticket.event.coverImages?.length) ids.add(ticket.event._id);
    }
    return [...ids];
  }, [tickets]);

  const events = useQueries({
    queries: missing.map((id) => ({
      queryKey: queryKeys.events.detail(id),
      queryFn: () => fetchEvent(id),
      staleTime: TICKET_STALE_TIME,
      // Artwork is a nicety; a deleted event must not retry on every row.
      retry: false,
    })),
  });

  // Cheap enough to rebuild each render, and the rows are memoised on the
  // resulting URL string rather than on this object.
  const covers: Record<string, string | null> = {};
  for (const ticket of tickets) {
    covers[ticket.event._id] = eventCoverUrl(ticket.event.coverImages);
  }
  for (const result of events) {
    if (result.data) covers[result.data._id] = eventCoverUrl(result.data.coverImages);
  }
  return covers;
}

/**
 * A single ticket by `ticketId`, `_id`, or the transaction that created it.
 * Reads the list caches first so opening a ticket from the list is instant.
 */
export function useTicket(id: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.tickets.public(id ?? ''),
    queryFn: () => fetchPublicTickets(id!),
    enabled: Boolean(id),
    staleTime: TICKET_STALE_TIME,
  });

  return { ...query, ticket: query.data?.[0] };
}

/**
 * One event's worth of tickets.
 *
 * Every purchase mints its own ticket document with its own QR — buying twice
 * for the same event is two admissions, not one ticket that counts to two — so
 * a flat list repeats the same event as many times as someone bought into it.
 * Grouping puts the event in the list once and the admissions behind it.
 */
export type TicketGroup = {
  /** The event id, or the ticket's own id when the event has been deleted. */
  key: string;
  event: Ticket['event'];
  cover: string | null;
  /** Newest purchase first, matching the list's own order. */
  tickets: Ticket[];
};

function groupByEvent(tickets: Ticket[], covers: Record<string, string | null>): TicketGroup[] {
  const groups = new Map<string, TicketGroup>();

  for (const ticket of tickets) {
    const key = ticket.event._id || ticket._id;
    const existing = groups.get(key);
    if (existing) {
      existing.tickets.push(ticket);
    } else {
      groups.set(key, {
        key,
        event: ticket.event,
        cover: covers[ticket.event._id] ?? null,
        tickets: [ticket],
      });
    }
  }

  return [...groups.values()];
}

/** The Tickets tab's list: one row per event, however many were bought. */
export function useTicketGroups() {
  const { tickets, ...rest } = useMyTickets();
  const covers = useTicketCovers(tickets);
  const groups = groupByEvent(tickets, covers);
  return { ...rest, tickets, groups };
}

/**
 * Everything bought for the same event as `ticketId`, and where in that set the
 * requested ticket sits — so opening one ticket lands on it and can be swiped
 * to its siblings.
 *
 * Falls back to the public single-ticket read when the id isn't in the list,
 * which is what makes a shared or deep-linked ticket still open.
 */
export function useTicketGroup(ticketId: string | undefined) {
  const { tickets, isLoading: listLoading } = useMyTickets();

  const mine = tickets.filter(
    (ticket) => ticket.event._id && ticket.event._id === findEventId(tickets, ticketId),
  );
  const inList = mine.length > 0;

  const single = useTicket(inList ? undefined : ticketId);

  const group = inList ? mine : (single.data ?? []);
  const index = Math.max(
    0,
    group.findIndex((ticket) => ticket.ticketId === ticketId),
  );

  return {
    tickets: group,
    initialIndex: index,
    isLoading: inList ? false : listLoading || single.isLoading,
    isError: !inList && single.isError,
    error: single.error,
    refetch: single.refetch,
  };
}

function findEventId(tickets: Ticket[], ticketId: string | undefined): string | undefined {
  if (!ticketId) return undefined;
  return tickets.find((ticket) => ticket.ticketId === ticketId)?.event._id || undefined;
}
