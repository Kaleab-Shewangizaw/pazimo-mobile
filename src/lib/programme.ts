import type { CinemaMovie, CinemaShowtime } from '@/types/api';

/**
 * Turning a flat list of screenings into the three days the cinema page offers.
 *
 * Kept pure and free of React so the boundaries can be reasoned about on their
 * own — "what counts as today" is the sort of thing that quietly breaks at
 * midnight, over a DST change, or for a 00:30 screening that a viewer still
 * thinks of as tonight.
 */

export type DayKey = 'now' | 'tomorrow' | 'soon';

export type DaySegment = {
  key: DayKey;
  label: string;
  /** Distinct films playing in this window, soonest first. */
  entries: ProgrammeEntry[];
};

export type ProgrammeEntry = {
  movie: CinemaMovie;
  /** Earliest screening of this film inside the window. */
  startsAt: string;
  /** Every screening of it in the window, soonest first. */
  showtimes: CinemaShowtime[];
};

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  // setDate rather than adding milliseconds: a DST boundary makes a "day" 23 or
  // 25 hours long, and only the calendar-aware setter lands on the right date.
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Buckets screenings by calendar day relative to `now`.
 *
 * A screening already under way is dropped: the server only returns
 * `startsAt >= now`, so anything in the today bucket is still joinable, and
 * that is what makes "Now Playing" honest rather than a list of films that
 * started an hour ago.
 */
export function groupByDay(showtimes: CinemaShowtime[], now: Date = new Date()): DaySegment[] {
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const dayAfterStart = addDays(todayStart, 2);

  const buckets: Record<DayKey, CinemaShowtime[]> = { now: [], tomorrow: [], soon: [] };

  for (const showtime of showtimes) {
    const at = new Date(showtime.startsAt);
    if (Number.isNaN(at.getTime())) continue;
    if (at < tomorrowStart) buckets.now.push(showtime);
    else if (at < dayAfterStart) buckets.tomorrow.push(showtime);
    else buckets.soon.push(showtime);
  }

  return [
    { key: 'now', label: 'Now Playing', entries: collapseToMovies(buckets.now) },
    { key: 'tomorrow', label: 'Tomorrow', entries: collapseToMovies(buckets.tomorrow) },
    { key: 'soon', label: 'Coming Soon', entries: collapseToMovies(buckets.soon) },
  ];
}

/**
 * One card per film, not per screening — a film showing four times a day should
 * be one poster you can swipe past, with its times attached.
 */
function collapseToMovies(showtimes: CinemaShowtime[]): ProgrammeEntry[] {
  const byMovie = new Map<string, ProgrammeEntry>();

  for (const showtime of showtimes) {
    const id = showtime.movie?._id;
    if (!id) continue;
    const existing = byMovie.get(id);
    if (existing) {
      existing.showtimes.push(showtime);
    } else {
      byMovie.set(id, {
        movie: showtime.movie,
        startsAt: showtime.startsAt,
        showtimes: [showtime],
      });
    }
  }

  // The server sorts by `startsAt`, so insertion order is already soonest-first
  // and each entry's own `showtimes` inherit that order.
  return [...byMovie.values()];
}

/** "12 JUN" — the headline date, matching the design's condensed caps. */
export function headlineDate(iso: string | undefined): string {
  const when = iso ? new Date(iso) : null;
  if (!when || Number.isNaN(when.getTime())) return '';
  const day = when.getDate();
  const month = when.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `${day} ${month}`;
}

/** The chips on the poster: runtime, then rating, then the first genre. */
export function movieChips(movie: CinemaMovie): string[] {
  const genres = Array.isArray(movie.genre) ? movie.genre : movie.genre ? [movie.genre] : [];
  return [
    movie.durationMinutes ? runtime(movie.durationMinutes) : null,
    movie.ageRating ? `${movie.ageRating}+` : null,
    genres[0] ?? null,
  ].filter((chip): chip is string => Boolean(chip));
}

function runtime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
