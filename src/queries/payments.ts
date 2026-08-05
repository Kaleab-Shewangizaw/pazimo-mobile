import { useQuery } from '@tanstack/react-query';

import { fetchPaymentConfig } from '@/api/payments';
import { queryKeys } from '@/queries/keys';
import type { PaymentConfig } from '@/types/api';

/**
 * Which provider is live. Rarely changes, but it is admin-switchable at
 * runtime and picking the wrong one sends unusable method ids, so it is read
 * rather than assumed.
 */
const FALLBACK: PaymentConfig = { activeProvider: 'CHAPA', giftCardMode: false };

export function usePaymentConfig() {
  const query = useQuery({
    queryKey: queryKeys.paymentConfig,
    queryFn: fetchPaymentConfig,
    staleTime: 10 * 60 * 1000,
  });

  // Chapa is the backend's own default when no config row exists, so falling
  // back to it keeps checkout usable if this read fails.
  return { ...query, config: query.data ?? FALLBACK };
}
