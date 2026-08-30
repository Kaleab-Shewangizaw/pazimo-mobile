import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchCinemaMovie, fetchCinemaShowtimes, fetchCinemas } from '@/api/cinema';
import { queryKeys } from '@/queries/keys';
import type { CinemaMovie } from '@/types/api';

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

/**
 * Every film currently programmed anywhere, deduped by movie id.
 *
 * No endpoint lists movies across cinemas — only a single cinema's own
 * showtimes do — so this merges every cinema's programme client-side, same
 * stopgap as the events catalogue in `queries/discover.ts`. Correct while the
 * cinema count stays small; the real fix is a search-capable
 * `/cinemas/public/movies` endpoint.
 */
export function useMoviesCatalogue(enabled = true) {
  const cinemas = useCinemas();

  const showtimeQueries = useQueries({
    queries: cinemas.cinemas.map((cinema) => ({
      queryKey: queryKeys.cinemas.showtimes(cinema._id),
      queryFn: () => fetchCinemaShowtimes(cinema._id),
      staleTime: CINEMA_STALE_TIME,
      enabled,
    })),
  });

  const movies = useMemo(() => {
    const byId = new Map<string, CinemaMovie>();
    for (const result of showtimeQueries) {
      for (const showtime of result.data ?? []) {
        if (!byId.has(showtime.movie._id)) byId.set(showtime.movie._id, showtime.movie);
      }
    }
    return [...byId.values()];
  }, [showtimeQueries]);

  return {
    movies,
    isLoading: cinemas.isLoading || (cinemas.cinemas.length > 0 && showtimeQueries.some((q) => q.isLoading)),
    isError: cinemas.isError || showtimeQueries.some((q) => q.isError),
    refetch: () => Promise.all([cinemas.refetch(), ...showtimeQueries.map((q) => q.refetch())]),
  };
}
