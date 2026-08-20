import { useQuery } from '@tanstack/react-query';

import { fetchCinemaShowtimes, fetchCinemas } from '@/api/cinema';
import { queryKeys } from '@/queries/keys';

/**
 * Programmes change when a cinema publishes or pulls a screening, which is a
 * human-scale event — minutes of staleness is fine, and it keeps the pager from
 * refetching every time someone swipes back to a poster they already saw.
 */
const CINEMA_STALE_TIME = 5 * 60 * 1000;

export function useCinemas(params?: { city?: string; search?: string }) {
  const query = useQuery({
    queryKey: queryKeys.cinemas.list(params?.city, params?.search),
    queryFn: () => fetchCinemas(params),
    staleTime: CINEMA_STALE_TIME,
  });

  return { ...query, cinemas: query.data ?? [] };
}

/**
 * Every upcoming screening, which the day rail slices into today / tomorrow /
 * later. Fetched whole rather than per-day: the list is one cinema's programme,
 * so it is small, and holding it means switching days costs nothing.
 */
export function useCinemaShowtimes(cinemaId: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.cinemas.showtimes(cinemaId ?? ''),
    queryFn: () => fetchCinemaShowtimes(cinemaId!),
    enabled: Boolean(cinemaId),
    staleTime: CINEMA_STALE_TIME,
  });

  return { ...query, showtimes: query.data ?? [] };
}
