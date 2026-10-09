import type { PointsSource, RecapPeriodType } from '@/types/api';

export const SOURCE_LABEL: Record<PointsSource, string> = {
  EVENT_TICKET: 'Event tickets',
  CINEMA_TICKET: 'Cinema tickets',
  EVENT_BEVERAGE: 'Drinks at events',
  VENUE_BEVERAGE: 'Drinks at venues',
  CINEMA_CONCESSION: 'Cinema snacks',
};

// Recap periods are East Africa Time calendar months/years on the server
// (Ethiopia has no DST), so "this month" is worked out the same way here
// rather than from the phone's own timezone.
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function eatNow() {
  const now = new Date(Date.now() + EAT_OFFSET_MS);
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
}

export function currentPeriodKey(period: RecapPeriodType): string {
  const { year, month } = eatNow();
  return period === 'year' ? String(year) : `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** The month or year `by` steps from `key` — null if that would be in the future. */
export function shiftPeriodKey(period: RecapPeriodType, key: string, by: number): string | null {
  const { year: nowYear, month: nowMonth } = eatNow();
  if (period === 'year') {
    const year = Number(key) + by;
    return year > nowYear ? null : String(year);
  }
  const [y, m] = key.split('-').map(Number);
  const index = y * 12 + (m - 1) + by;
  if (index > nowYear * 12 + nowMonth) return null;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function periodLabel(period: RecapPeriodType, key: string): string {
  if (period === 'year') return key;
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export const formatPoints = (n: number) => Math.round(n).toLocaleString('en-US');
