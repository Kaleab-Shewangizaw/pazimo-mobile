import { useEffect, useState } from 'react';

import { ApiError } from '@/api/client';
import { fetchEventRefillOrder, fetchVenueRefillOrder } from '@/api/beverages';
import { fetchPaymentStatus } from '@/api/payments';
import type { RefillOrder } from '@/types/api';

/**
 * `usePaymentWatcher`'s refill counterpart. Same poll, same timing — `GET
 * /payments/status` is the generic settlement path shared by every checkout in
 * this app, ticket or otherwise — but once it flips to `COMPLETED` this reads
 * the order back from whichever channel's own endpoint produced it.
 *
 * There is no third id to carry the channel explicitly: the backend's own
 * transaction id already says it — `startEventRefillCheckout` mints `BEV-…`,
 * `startVenueRefillCheckout` mints `VBEV-…` — so the prefix is the dispatch,
 * not a guess.
 */

const EXPIRY_MS = 3 * 60 * 1000;

function delayFor(attempt: number): number {
  if (attempt < 3) return 500;
  if (attempt < 6) return 1000;
  if (attempt < 10) return 1500;
  return 2000;
}

const MISSING_TOLERANCE = 2;

export type RefillOrderPhase = 'waiting' | 'issued' | 'cancelled' | 'failed' | 'timeout' | 'error';

export type RefillOrderWatch = {
  phase: RefillOrderPhase;
  order: RefillOrder | null;
  message?: string;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fetchOrderFor(transactionId: string): Promise<RefillOrder> {
  return transactionId.startsWith('VBEV-')
    ? fetchVenueRefillOrder(transactionId)
    : fetchEventRefillOrder(transactionId);
}

export function useRefillOrderWatcher(transactionId: string | undefined): RefillOrderWatch {
  const [watch, setWatch] = useState<RefillOrderWatch>({ phase: 'waiting', order: null });

  useEffect(() => {
    if (!transactionId) return;

    let cancelled = false;
    const startedAt = Date.now();

    async function collectOrder(): Promise<RefillOrder | null> {
      try {
        const order = await fetchOrderFor(transactionId!);
        return order.sales.length ? order : null;
      } catch {
        // Settlement can lag a beat behind the payment flipping COMPLETED.
        return null;
      }
    }

    async function poll() {
      let attempt = 0;
      let missing = 0;

      while (!cancelled) {
        if (Date.now() - startedAt > EXPIRY_MS) {
          setWatch({ phase: 'timeout', order: null });
          return;
        }

        try {
          const status = await fetchPaymentStatus(transactionId!);
          if (cancelled) return;

          if (status.status === 'COMPLETED') {
            const order = await collectOrder();
            if (cancelled) return;

            if (order) {
              if (!cancelled) setWatch({ phase: 'issued', order });
              return;
            }
            // Paid, but the sales haven't been written yet — keep waiting.
          } else if (status.status === 'CANCELLED') {
            setWatch({
              phase: 'cancelled',
              order: null,
              message: 'The payment was cancelled. Nothing has been charged.',
            });
            return;
          } else if (status.status === 'FAILED') {
            setWatch({
              phase: 'failed',
              order: null,
              message: 'The payment did not go through. Check your balance and try again.',
            });
            return;
          } else if (status.status === 'NOT_FOUND') {
            missing += 1;
            if (missing > MISSING_TOLERANCE) {
              setWatch({ phase: 'failed', order: null, message: 'We could not find that payment.' });
              return;
            }
          }
        } catch (error) {
          if (cancelled) return;
          if (error instanceof ApiError && error.status === 404) {
            missing += 1;
            if (missing > MISSING_TOLERANCE) {
              setWatch({ phase: 'failed', order: null, message: 'We could not find that payment.' });
              return;
            }
          } else if (error instanceof ApiError && error.isBanned) {
            setWatch({ phase: 'error', order: null, message: error.message });
            return;
          }
          // Anything else is transport noise; the payment is still running.
        }

        await wait(delayFor(attempt));
        attempt += 1;
      }
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  return watch;
}
