import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import { fetchEvent, fetchEventsPage, fetchWishlist, updateWishlist } from '@/api/events';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';

const FEED_PAGE_SIZE = 10;

/**
 * The infinite feed rides `GET /api/events`, the only endpoint in the API with
 * real page/limit pagination. `pages` in the envelope is the total page count,
 * so the cursor simply stops when the last page is reached.
 */
export function useEventFeed() {
  return useInfiniteQuery({
    queryKey: queryKeys.events.feed(),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchEventsPage({ page: pageParam, limit: FEED_PAGE_SIZE }),
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.pages ? last.pagination.page + 1 : undefined,
    select: (data) => data.pages.flatMap((page) => page.events),
  });
}

export function useEvent(idOrShortId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.detail(idOrShortId ?? ''),
    queryFn: () => fetchEvent(idOrShortId!),
    enabled: Boolean(idOrShortId),
  });
}

/** Requires a session — there is no guest wishlist on the server. */
export function useWishlist() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const query = useQuery({
    queryKey: queryKeys.wishlist,
    queryFn: fetchWishlist,
    enabled: hydrated && Boolean(token),
  });

  return { ...query, events: query.data ?? [] };
}

/** Manual mutation shape — matches `useSetContact`'s, this codebase has no `useMutation` anywhere. */
export function useSetWishlist() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(
    async (eventId: string, wantOnWishlist: boolean) => {
      setSubmitting(true);
      setError(null);
      try {
        await updateWishlist(eventId, wantOnWishlist ? 'add' : 'remove');
        await queryClient.invalidateQueries({ queryKey: queryKeys.wishlist });
        return true;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That did not go through. Try again.');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [queryClient],
  );

  return { set, submitting, error };
}
