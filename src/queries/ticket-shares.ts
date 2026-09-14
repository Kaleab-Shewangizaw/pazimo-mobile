import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { ApiError } from '@/api/client';
import {
  acceptTicketShare,
  cancelTicketShare,
  createTicketShare,
  declineTicketShare,
  fetchShareContacts,
  fetchTicketShares,
  searchShareRecipients,
  type ShareDirection,
  type ShareItemInput,
} from '@/api/ticket-shares';
import { groupSharesByCounterparty } from '@/lib/conversations';
import { isResolvableIdentifier } from '@/lib/identifier';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';
import type { ShareStatus } from '@/types/api';

/**
 * The one list hook every share screen reads from — the full history, the
 * outgoing-pending lock check on a ticket, and the incoming-pending header
 * badge are all just this hook with different filters, so any two call sites
 * that ask for the same filters share one cache entry.
 */
export function useTicketShares(
  params: { direction?: ShareDirection; status?: ShareStatus } = {},
) {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const query = useQuery({
    queryKey: queryKeys.shares.list(params.direction, params.status),
    queryFn: () => fetchTicketShares(params),
    enabled: hydrated && Boolean(token),
  });

  return { ...query, shares: query.data ?? [] };
}

/**
 * The full share history collapsed to one row per counterparty — what the
 * Chats list and a conversation screen both read from. A pure `useMemo` over
 * `useTicketShares`, so it re-derives (and re-sorts) automatically whenever
 * that list refetches — including the live refetch the socket bridge
 * triggers on `ticket:transfer`/`ticket:received`.
 */
export function useShareConversations() {
  const myId = useAuthStore((s) => s.user?._id);
  const { shares, ...rest } = useTicketShares({});

  const conversations = useMemo(() => groupSharesByCounterparty(shares, myId), [shares, myId]);

  return { ...rest, conversations };
}

/** Recent people to share with — derived from history, no separate contacts list. */
export function useShareContacts() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const query = useQuery({
    queryKey: queryKeys.shares.contacts(),
    queryFn: fetchShareContacts,
    enabled: hydrated && Boolean(token),
  });

  return { ...query, contacts: query.data ?? [] };
}

/**
 * Exact-match only — the server never returns a fuzzy list, so this never
 * fires a request for an input that couldn't possibly resolve to one (a
 * partial username, a half-typed phone number). That is what keeps this from
 * spamming the backend on every keystroke, not a debounce.
 */
export function useShareSearch(text: string) {
  const token = useAuthStore((s) => s.token);
  const needle = text.trim();

  const query = useQuery({
    queryKey: queryKeys.shares.search(needle),
    queryFn: () => searchShareRecipients(needle),
    enabled: Boolean(token) && isResolvableIdentifier(needle),
    staleTime: 30 * 1000,
  });

  return { ...query, results: query.data ?? [] };
}

/** Manual mutation shape — this codebase has no `useMutation` anywhere. */
export function useCreateShare() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (payload: {
      toUserId: string;
      items: ShareItemInput[];
      message?: string;
      idempotencyKey?: string;
    }) => {
      setSubmitting(true);
      setError(null);
      try {
        const share = await createTicketShare(payload);
        queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
        // The tickets just spent for/against are now locked (pending) or reduced in capacity.
        queryClient.invalidateQueries({ queryKey: queryKeys.tickets.transferable() });
        return share;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not send that ticket. Try again.');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [queryClient],
  );

  return { submit, submitting, error };
}

type RespondAction = 'accept' | 'decline' | 'cancel';

/** Shared by the ticket-screen banner (cancel) and the share detail sheet (accept/decline/cancel). */
export function useRespondToShare() {
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<RespondAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = useCallback(
    async (action: RespondAction, shareId: string) => {
      setPendingAction(action);
      setError(null);
      try {
        const run =
          action === 'accept'
            ? acceptTicketShare
            : action === 'decline'
              ? declineTicketShare
              : cancelTicketShare;
        const share = await run(shareId);
        // Accepting moves real ticket ownership — both lists change, not just the share.
        queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.tickets.transferable() });
        return share;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That did not go through. Try again.');
        return null;
      } finally {
        setPendingAction(null);
      }
    },
    [queryClient],
  );

  return {
    accept: (shareId: string) => respond('accept', shareId),
    decline: (shareId: string) => respond('decline', shareId),
    cancel: (shareId: string) => respond('cancel', shareId),
    submitting: pendingAction !== null,
    pendingAction,
    error,
  };
}
