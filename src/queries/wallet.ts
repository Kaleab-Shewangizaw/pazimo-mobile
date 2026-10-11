import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchWallet, fetchWalletDevices, fetchWalletStatement } from '@/api/wallet';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';

function useSignedIn() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  return hydrated && Boolean(token);
}

/** The wallet as seen from this phone. Guests have none, so it never runs for them. */
export function useMyWallet() {
  return useQuery({
    queryKey: queryKeys.wallet.mine(),
    queryFn: fetchWallet,
    enabled: useSignedIn(),
  });
}

/** Deposits, payments and refunds, newest first. Only for a wallet this phone may open. */
export function useWalletStatement(enabled: boolean) {
  const signedIn = useSignedIn();
  const query = useInfiniteQuery({
    queryKey: queryKeys.wallet.statement(),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchWalletStatement(pageParam),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: signedIn && enabled,
  });
  return { ...query, entries: query.data?.pages.flatMap((page) => page.entries) ?? [] };
}

/** The phones this wallet works on. Only for a wallet this phone may open. */
export function useWalletDevices(enabled: boolean) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.wallet.devices(),
    queryFn: fetchWalletDevices,
    enabled: signedIn && enabled,
  });
}
