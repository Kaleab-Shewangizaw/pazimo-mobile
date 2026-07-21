import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Serve cached data instantly and avoid refetch storms on remount/focus.
      staleTime: 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: (failureCount, error) => {
        // A 4xx will keep failing — only retry transport-level problems.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: { retry: 0 },
  },
});
