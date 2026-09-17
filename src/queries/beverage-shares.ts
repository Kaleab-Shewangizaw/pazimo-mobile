import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import {
  acceptBeverageShare,
  cancelBeverageShare,
  createBeverageShare,
  declineBeverageShare,
  fetchBeverageShares,
  fetchTransferableBeverageSales,
  type BeverageShareItemInput,
  type ShareDirection,
} from '@/api/beverage-shares';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';
import type { BeverageSalesContext, ShareStatus } from '@/types/api';

/** The drinks twin of `queries/ticket-shares.ts` — same shape throughout. */
export function useBeverageShares(
  params: { direction?: ShareDirection; status?: ShareStatus } = {},
) {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const query = useQuery({
    queryKey: queryKeys.beverageShares.list(params.direction, params.status),
    queryFn: () => fetchBeverageShares(params),
    enabled: hydrated && Boolean(token),
  });

  return { ...query, shares: query.data ?? [] };
}

/** Every drink this account currently holds that is free to send — the drink-attach picker's data source. */
export function useTransferableBeverageSales() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const query = useQuery({
    queryKey: queryKeys.beverageShares.transferable(),
    queryFn: fetchTransferableBeverageSales,
    enabled: hydrated && Boolean(token),
  });

  return { ...query, sales: query.data ?? [] };
}

/** Manual mutation shape — matches `useCreateShare`'s, this codebase has no `useMutation` anywhere. */
export function useCreateBeverageShare() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (payload: {
      toUserId: string;
      salesContext: BeverageSalesContext;
      items: BeverageShareItemInput[];
      message?: string;
      idempotencyKey?: string;
    }) => {
      setSubmitting(true);
      setError(null);
      try {
        const share = await createBeverageShare(payload);
        queryClient.invalidateQueries({ queryKey: queryKeys.beverageShares.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.refill.all });
        return share;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not send that drink. Try again.');
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

export function useRespondToBeverageShare() {
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
            ? acceptBeverageShare
            : action === 'decline'
              ? declineBeverageShare
              : cancelBeverageShare;
        const share = await run(shareId);
        queryClient.invalidateQueries({ queryKey: queryKeys.beverageShares.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.refill.all });
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
