import { useCallback, useEffect, useRef, useState } from 'react';

/** What react-query's `refetch` looks like once its result is thrown away. */
type Refetch = () => Promise<unknown>;

/**
 * Drives a `RefreshControl` from one or more react-query refetches.
 *
 * The spinner tracks this local flag rather than any query's `isRefetching`,
 * for two reasons: it stays up until *every* refetch settles instead of
 * flickering off after the first, and it never appears for the background
 * refetches the user did not ask for.
 *
 * Rejections are swallowed — the screen's own error state already owns that
 * story, so a pull that fails just puts the spinner away.
 */
export function useRefresh(...refetch: Refetch[]) {
  const [refreshing, setRefreshing] = useState(false);

  // Read at pull time, so `onRefresh` can keep one identity for the life of the
  // screen without ever calling a stale refetch.
  const latest = useRef(refetch);
  useEffect(() => {
    latest.current = refetch;
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled(latest.current.map((run) => run()));
    setRefreshing(false);
  }, []);

  return { refreshing, onRefresh };
}
