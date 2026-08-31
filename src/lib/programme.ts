import type { CinemaMovie, CinemaShowtime } from '@/types/api';

/**
 * Turning a flat list of screenings into the three days the cinema page offers.
 *
 * Kept pure and free of React so the boundaries can be reasoned about on their
 * own — "what counts as today" is the sort of thing that quietly breaks at
 * midnight, over a DST change, or for a 00:30 screening that a viewer still
 * thinks of as tonight.
 */

export type DayKey = 'today' | 'tomorrow' | 'later';

export type ProgrammeEntry = {
  movie: CinemaMovie;
  /** Earliest screening of this film inside the window. */
  startsAt: string;
  /** Every screening of it in the window, soonest first. */
  showtimes: CinemaShowtime[];
};

/** One calendar date beyond tomorrow that the cinema actually has something on. */
export type ComingSoonDay = {
  /** `YYYY-MM-DD`, matching the key the movie-detail endpoint groups by. */
  date: string;
  /** "FRI 29 AUG" — short enough for a rail tab or a picker row. */
  label: string;
  entries: ProgrammeEntry[];
};

export type ProgrammeSchedule = {
  today: ProgrammeEntry[];
  tomorrow: ProgrammeEntry[];
  /**
   * Day-after-tomorrow onward, one bucket per calendar date the cinema has
   * actually published, soonest first. Not a fixed week: a cinema's plan is
   * often shorter than that (and sometimes longer), so this is exactly
   * whichever dates are present in `showtimes` — nothing synthesized.
   */
  laterDays: ComingSoonDay[];
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

/** `YYYY-MM-DD` in local time — matches `CinemaMovieDay.date` from the API. */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** The `YYYY-MM-DD` key an ISO timestamp's calendar day falls on. */
export function dayKeyOf(iso: string): string {
  return dateKey(new Date(iso));
}

/** Today's date key, for matching a picked "Today" tab against a movie's `days`. */
export function todayKey(now: Date = new Date()): string {
  return dateKey(now);
}

/** Tomorrow's date key, for matching a picked "Tomorrow" tab against a movie's `days`. */
export function tomorrowKey(now: Date = new Date()): string {
  return dateKey(addDays(now, 1));
}

/** "FRI 29 AUG" for a rail tab or a coming-soon picker row. */
export function shortDayLabel(key: string): string {
  const when = new Date(`${key}T00:00:00`);
  if (Number.isNaN(when.getTime())) return '';
  const weekday = when.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const day = when.getDate();
  const month = when.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `${weekday} ${day} ${month}`;
}

/**
 * Buckets screenings into today, tomorrow, and one bucket per later date.
 *
 * A screening already under way is dropped: the server only returns
 * `startsAt >= now`, so anything in the today bucket is still joinable, and
 * that is what makes "Today" honest rather than a list of films that started
 * an hour ago. The same guarantee is what keeps a passed day (yesterday, or an
 * earlier date this week) from ever appearing at all — there is nothing to
 * filter here because it never arrives.
 */
export function buildSchedule(showtimes: CinemaShowtime[], now: Date = new Date()): ProgrammeSchedule {
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const dayAfterStart = addDays(todayStart, 2);

  const today: CinemaShowtime[] = [];
  const tomorrow: CinemaShowtime[] = [];
  const laterByKey = new Map<string, CinemaShowtime[]>();
  const laterOrder: string[] = [];

  for (const showtime of showtimes) {
    const at = new Date(showtime.startsAt);
    if (Number.isNaN(at.getTime())) continue;
    if (at < tomorrowStart) {
      today.push(showtime);
    } else if (at < dayAfterStart) {
      tomorrow.push(showtime);
    } else {
      const key = dateKey(at);
      if (!laterByKey.has(key)) {
        laterByKey.set(key, []);
        laterOrder.push(key);
      }
      laterByKey.get(key)!.push(showtime);
    }
  }

  return {
    today: collapseToMovies(today),
    tomorrow: collapseToMovies(tomorrow),
    laterDays: laterOrder.map((key) => ({
      date: key,
      label: shortDayLabel(key),
      entries: collapseToMovies(laterByKey.get(key)!),
    })),
  };
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
