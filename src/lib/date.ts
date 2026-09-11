const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const weekdayLong = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const monthShort = new Intl.DateTimeFormat('en-US', { month: 'short' });
const weekdayShort = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const fullDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

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

/**
 * "Jan 25, 2026 · 6:00 PM" — the year is spelled out because a ticket is kept
 * and looked at long after the feed's relative dates stop making sense.
 */
export function formatTicketDate(startDate?: string | null, startTime?: string | null): string {
  const date = parse(startDate);
  return [date ? fullDate.format(date) : null, startTime?.trim()].filter(Boolean).join(' · ');
}

export function isPast(value?: string | null): boolean {
  const date = parse(value);
  return date ? date.getTime() < Date.now() : false;
}

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = MS_PER_MINUTE * 60;

/**
 * "Just now" / "2h ago" / "3d ago" for a chat-style feed — coarse enough that
 * it never needs to tick while the screen is open. Falls back to the short
 * date past a week, same as everything else in this file returning `null`
 * rather than throwing on an unparseable value.
 */
export function relativeTimeLabel(value?: string | null): string | null {
  const date = parse(value);
  if (!date) return null;

  const diff = Date.now() - date.getTime();
  if (diff < MS_PER_MINUTE) return 'Just now';
  if (diff < MS_PER_HOUR) return `${Math.floor(diff / MS_PER_MINUTE)}m ago`;
  if (diff < MS_PER_DAY) return `${Math.floor(diff / MS_PER_HOUR)}h ago`;
  const days = Math.floor(diff / MS_PER_DAY);
  if (days < 7) return `${days}d ago`;
  return formatShortDate(value);
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
