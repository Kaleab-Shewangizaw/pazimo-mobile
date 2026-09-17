import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import {
  acceptCinemaShare,
  cancelCinemaShare,
  createCinemaShare,
  declineCinemaShare,
  fetchCinemaShares,
  fetchTransferableCinemaConcessions,
  fetchTransferableCinemaTickets,
  type CinemaShareItemInput,
  type ShareDirection,
} from '@/api/cinema-shares';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';
import type { CinemaShareItemType, ShareStatus } from '@/types/api';

/** The cinema twin of `queries/beverage-shares.ts` — same shape throughout. */
export function useCinemaShares(
  params: { direction?: ShareDirection; status?: ShareStatus } = {},
) {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const query = useQuery({
    queryKey: queryKeys.cinemaShares.list(params.direction, params.status),
    queryFn: () => fetchCinemaShares(params),
    enabled: hydrated && Boolean(token),
  });

  return { ...query, shares: query.data ?? [] };
}

export function useTransferableCinemaTickets() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const query = useQuery({
    queryKey: queryKeys.cinemaShares.transferableTickets(),
    queryFn: fetchTransferableCinemaTickets,
    enabled: hydrated && Boolean(token),
  });

  return { ...query, tickets: query.data ?? [] };
}

export function useTransferableCinemaConcessions() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const query = useQuery({
    queryKey: queryKeys.cinemaShares.transferableConcessions(),
    queryFn: fetchTransferableCinemaConcessions,
    enabled: hydrated && Boolean(token),
  });

  return { ...query, concessions: query.data ?? [] };
}

/** Manual mutation shape — matches `useCreateShare`'s, this codebase has no `useMutation` anywhere. */
export function useCreateCinemaShare() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (payload: {
      toUserId: string;
      itemType: CinemaShareItemType;
      items: CinemaShareItemInput[];
      message?: string;
      idempotencyKey?: string;
    }) => {
      setSubmitting(true);
      setError(null);
      try {
        const share = await createCinemaShare(payload);
        queryClient.invalidateQueries({ queryKey: queryKeys.cinemaShares.all });
        return share;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not send that. Try again.');
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

export function useRespondToCinemaShare() {
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
            ? acceptCinemaShare
            : action === 'decline'
              ? declineCinemaShare
              : cancelCinemaShare;
        const share = await run(shareId);
        queryClient.invalidateQueries({ queryKey: queryKeys.cinemaShares.all });
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
