import { useQuery } from '@tanstack/react-query';

import { fetchAppBackground } from '@/api/app-background';
import { queryKeys } from '@/queries/keys';

/**
 * Every screen's backdrop reads this, so it's one shared request. Admins change
 * it rarely, and a stale backdrop is harmless.
 */
export function useAppBackground() {
  return useQuery({
    queryKey: queryKeys.appBackground,
    queryFn: fetchAppBackground,
    staleTime: 30 * 60 * 1000,
  });
}
