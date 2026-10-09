import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchMyRewards, fetchPointsHistory, fetchRecap } from '@/api/rewards';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';
import type { RecapPeriodType } from '@/types/api';

function useSignedIn() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  return hydrated && Boolean(token);
}

/** Score badge + medal shelf. Guests have no score, so it never runs for them. */
export function useMyRewards() {
  return useQuery({
    queryKey: queryKeys.rewards.mine(),
    queryFn: fetchMyRewards,
    enabled: useSignedIn(),
  });
}

export function usePointsHistory() {
  const query = useInfiniteQuery({
    queryKey: queryKeys.rewards.history(),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchPointsHistory({ before: pageParam }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: useSignedIn(),
  });
  return { ...query, items: query.data?.pages.flatMap((page) => page.items) ?? [] };
}

export function useRecap(period: RecapPeriodType, key: string) {
  return useQuery({
    queryKey: queryKeys.rewards.recap(period, key),
    queryFn: () => fetchRecap(period, key),
    enabled: useSignedIn(),
    // A past month never changes; the current one only moves on a purchase.
    staleTime: 5 * 60 * 1000,
  });
}
