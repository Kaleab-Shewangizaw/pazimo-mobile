import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { fetchCinemaMovie, fetchCinemaShowtimes, fetchCinemas, fetchFeaturedCinemaMovies } from '@/api/cinema';
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
    // Search re-keys this query on every keystroke — without this the list (and
    // the search field sitting above it) would unmount into a spinner between
    // each character instead of holding the last result while the next loads.
    placeholderData: keepPreviousData,
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

/**
 * A single film's page.
 *
 * `retry: false` on purpose: the common failure here is a 404 for a film the
 * admin has not published, which is a settled answer rather than a blip, and
 * retrying it three times only delays the screen showing what it does know.
 */
export function useCinemaMovie(movieId: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.cinemas.movie(movieId ?? ''),
    queryFn: () => fetchCinemaMovie(movieId!),
    enabled: Boolean(movieId),
    staleTime: CINEMA_STALE_TIME,
    retry: false,
  });

  return { ...query, page: query.data };
}

/** The admin-curated featured row — spans every cinema, each entry carrying its own populated `cinema`. */
export function useFeaturedCinemaMovies() {
  const query = useQuery({
    queryKey: queryKeys.cinemas.featuredMovies(),
    queryFn: () => fetchFeaturedCinemaMovies(),
    staleTime: CINEMA_STALE_TIME,
  });

  return { ...query, movies: query.data ?? [] };
}
