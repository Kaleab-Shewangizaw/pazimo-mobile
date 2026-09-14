import { getData } from '@/api/client';
import type { Cinema, CinemaConcessionItem, CinemaMovie, CinemaMoviePage, CinemaShowtime } from '@/types/api';

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

/**
 * One film's page: the movie, its cinema, and its screenings grouped by day.
 *
 * Accepts a raw id or a `pretty-slug-shortid`. Note this endpoint is gated on
 * `publicationStatus: "published"` while the showtimes endpoint is not, so a
 * film can legitimately appear in a programme and 404 here — callers must treat
 * a miss as "not published yet", not as a broken link.
 */
export async function fetchCinemaMovie(movieId: string) {
  return getData<CinemaMoviePage>(`/cinemas/public/movies/${movieId}`);
}

/** What a customer can buy at this cinema's counter — already filtered to in-stock, active items. */
export async function fetchCinemaConcessions(cinemaId: string) {
  return getData<CinemaConcessionItem[]>(`/cinemas/public/${cinemaId}/concessions`);
}

/**
 * The admin-curated featured row — spans every cinema (unlike the rest of this
 * file), so each entry carries its own populated `cinema` rather than being
 * scoped to one the caller already picked.
 */
export async function fetchFeaturedCinemaMovies(limit = 12) {
  return getData<CinemaMovie[]>('/cinemas/public/featured-movies', { params: { limit } });
}
