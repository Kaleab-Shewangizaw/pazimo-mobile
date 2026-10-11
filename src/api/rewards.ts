import { getData } from '@/api/client';
import type { MyRewards, PointsHistoryPage, Recap, RecapPeriodType } from '@/types/api';

/** Score, the medal shelf (earned and still locked), and what earns points right now. */
export async function fetchMyRewards(): Promise<MyRewards> {
  const data = await getData<MyRewards>('/rewards/me');
  // Accounts that have never earned have no `score` stored, so the server
  // sends none (and a null `remaining`) — that's a score of 0, not NaN.
  const score = Number(data.score) || 0;
  return {
    ...data,
    score,
    next: data.next
      ? { ...data.next, remaining: Number.isFinite(data.next.remaining) ? data.next.remaining : Math.max(0, data.next.threshold - score) }
      : null,
  };
}

/** Purchases that earned points, newest first, cursor-paginated by award id. */
export function fetchPointsHistory(params: { before?: string } = {}): Promise<PointsHistoryPage> {
  return getData<PointsHistoryPage>('/rewards/me/history', { params });
}

/**
 * The shareable recap for one month (`key` "2026-10") or year ("2026"),
 * with the admin's card templates already filled with this account's numbers.
 */
export function fetchRecap(period: RecapPeriodType, key: string): Promise<Recap> {
  return getData<Recap>('/rewards/recap', { params: { period, key } });
}
