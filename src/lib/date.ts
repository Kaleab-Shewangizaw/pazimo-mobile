const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const weekdayLong = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const monthShort = new Intl.DateTimeFormat('en-US', { month: 'short' });

function parse(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Mar 14" */
export function formatShortDate(value?: string | null): string | null {
  const date = parse(value);
  return date ? monthDay.format(date) : null;
}

/** "Fri, Mar 14" */
export function formatLongDate(value?: string | null): string | null {
  const date = parse(value);
  return date ? weekdayLong.format(date) : null;
}

/** Split form for the calendar chip on cover art. */
export function formatDateBadge(value?: string | null): { month: string; day: string } | null {
  const date = parse(value);
  if (!date) return null;
  return { month: monthShort.format(date).toUpperCase(), day: String(date.getDate()) };
}

/**
 * `startTime` is a free-form string on the model (e.g. "18:00"), so it is shown
 * verbatim rather than parsed.
 */
export function formatDateTime(startDate?: string | null, startTime?: string | null): string {
  const parts = [formatLongDate(startDate), startTime?.trim()].filter(Boolean);
  return parts.join(' · ');
}

export function isPast(value?: string | null): boolean {
  const date = parse(value);
  return date ? date.getTime() < Date.now() : false;
}
