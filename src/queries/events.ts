import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchEvent, fetchEventsPage } from '@/api/events';
import { queryKeys } from '@/queries/keys';

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
