const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const weekdayLong = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const monthShort = new Intl.DateTimeFormat('en-US', { month: 'short' });
const weekdayShort = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

const MS_PER_DAY = 86_400_000;

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

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * `startTime` is free-form (e.g. "18:00" or "6:00 PM"), so this only reads the
 * leading number and never throws on a value it can't make sense of.
 */
function parseHour(time?: string | null): number | null {
  const match = time?.trim().match(/^(\d{1,2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  return Number.isFinite(hour) ? hour : null;
}

/**
 * Compact "when" label for a badge/chip: "TONIGHT", "TODAY", "TOMORROW", or a
 * short weekday + day ("FRI 14") beyond that. Returns null for past events —
 * there's nothing useful to badge them with.
 */
export function relativeDayLabel(startDate?: string | null, startTime?: string | null): string | null {
  const date = parse(startDate);
  if (!date) return null;

  const dayDiff = Math.round((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / MS_PER_DAY);
  if (dayDiff < 0) return null;
  if (dayDiff === 0) {
    const hour = parseHour(startTime);
    return hour !== null && hour >= 17 ? 'TONIGHT' : 'TODAY';
  }
  if (dayDiff === 1) return 'TOMORROW';
  return `${weekdayShort.format(date).toUpperCase()} ${date.getDate()}`;
}
