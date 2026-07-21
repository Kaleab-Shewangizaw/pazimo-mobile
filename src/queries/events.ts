import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  fetchBannerEvents,
  fetchEvent,
  fetchEventsPage,
  fetchPublicEvents,
} from '@/api/events';
import { queryKeys } from '@/queries/keys';

const FEED_PAGE_SIZE = 10;
const RAIL_SIZE = 12;

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

export function useFeaturedEvents() {
  return useQuery({
    queryKey: queryKeys.events.featured(),
    queryFn: () => fetchPublicEvents({ limit: RAIL_SIZE, isFeatured: true }),
    select: (data) => data.events,
  });
}

export function useTrendingEvents() {
  return useQuery({
    queryKey: queryKeys.events.trending(),
    queryFn: () => fetchPublicEvents({ limit: RAIL_SIZE, isTrending: true }),
    select: (data) => data.events,
  });
}

/** Banner events are filtered client-side — `bannerStatus` is not queryable. */
export function useBannerEvents() {
  return useQuery({
    queryKey: queryKeys.events.banner(),
    queryFn: () => fetchBannerEvents(),
  });
}

export function useEvent(idOrShortId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.detail(idOrShortId ?? ''),
    queryFn: () => fetchEvent(idOrShortId!),
    enabled: Boolean(idOrShortId),
  });
}
