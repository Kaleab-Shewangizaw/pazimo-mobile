import { useQuery } from '@tanstack/react-query';

import { fetchPaymentConfig, fetchPaymentMethods } from '@/api/payments';
import { queryKeys } from '@/queries/keys';
import type { PaymentConfig, PaymentMethodOption } from '@/types/api';

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

/**
 * The methods an admin has switched on, in their order (Admin → Finance →
 * Payment methods). Kept fresh-ish because methods get switched off while
 * they're failing; the server refuses a switched-off one anyway, so a stale
 * list costs a friendly error, not a broken payment.
 *
 * `methods` is undefined while the first load is in flight, and falls back to
 * the long-standing four if the read fails, so checkout still works.
 */
const FALLBACK_METHODS: PaymentMethodOption[] = [
  { key: 'telebirr', label: 'Telebirr', kind: 'mobile', image: null },
  { key: 'cbebirr', label: 'CBE Birr', kind: 'mobile', image: null },
  { key: 'mpesa', label: 'M-Pesa', kind: 'mobile', image: null },
  { key: 'awashbirr', label: 'Awash', kind: 'mobile', image: null },
  { key: 'card', label: 'Visa / Mastercard', kind: 'card', image: null },
];

export function usePaymentMethods() {
  const query = useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: fetchPaymentMethods,
    staleTime: 60 * 1000,
  });
  const methods = query.data ?? (query.isError ? FALLBACK_METHODS : undefined);
  return { ...query, methods };
}
