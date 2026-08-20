import { getData } from '@/api/client';
import type { Cinema, CinemaShowtime } from '@/types/api';

/**
 * Cinema browsing. Mounted at `/api/cinemas`, so every path here starts
 * `/cinemas/public` — the literal `public` segment is declared before the
 * `/:cinemaId` patterns server-side precisely so it is never read as an id.
 */

/** Every active cinema, name-sorted. Both filters are optional and server-side. */
export async function fetchCinemas(params?: { city?: string; search?: string }) {
  return getData<Cinema[]>('/cinemas/public/cinemas', { params });
}

/**
 * Every upcoming screening at a cinema, soonest first, with the movie and hall
 * populated. This is the source for the day rail: the programme endpoint only
 * reports each film's *next* showtime, which cannot answer "what is on
 * tomorrow" for a film that also plays today.
 */
export async function fetchCinemaShowtimes(cinemaId: string) {
  return getData<CinemaShowtime[]>(`/cinemas/public/${cinemaId}/showtimes`);
}
