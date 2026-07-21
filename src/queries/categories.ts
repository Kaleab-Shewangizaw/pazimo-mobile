import { useQuery } from '@tanstack/react-query';

import { fetchCategories } from '@/api/categories';
import { queryKeys } from '@/queries/keys';

/** Categories change rarely, so this cache outlives the default stale time. */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategories,
    staleTime: 30 * 60 * 1000,
  });
}
