import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { fetchEventVenues } from '@/api/event-venues';
import { queryKeys } from '@/queries/keys';

/** A venue directory changes rarely, so a few minutes of staleness is fine. */
const EVENT_VENUE_STALE_TIME = 5 * 60 * 1000;

export function useEventVenues(params?: { city?: string; search?: string }) {
  const query = useQuery({
    queryKey: queryKeys.eventVenues.list(params?.city, params?.search),
    queryFn: () => fetchEventVenues(params),
    staleTime: EVENT_VENUE_STALE_TIME,
    // Search re-keys this query on every keystroke — without this the list would
    // unmount into a spinner between each character instead of holding the last
    // result while the next loads.
    placeholderData: keepPreviousData,
  });

  return { ...query, venues: query.data ?? [] };
}
