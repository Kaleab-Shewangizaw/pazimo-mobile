import { useEffect, useState } from 'react';

import { ApiError } from '@/api/client';
import { cancelCinemaCheckout, fetchCinemaOrder } from '@/api/cinema-checkout';
import { fetchPaymentStatus } from '@/api/payments';
import type { CinemaOrder } from '@/types/api';

/**
 * `usePaymentWatcher`'s cinema counterpart.
 *
 * `GET /payments/status` settles a cinema order exactly the way it settles an
 * event one — but its response only ever resolves `ticketId` against the
 * event `Ticket` collection, never `CinemaTicket`. So once status flips to
 * `COMPLETED`, this reads the order back from `GET /cinemas/public/orders/:id`
 * instead of the event ticket lookup `usePaymentWatcher` uses.
 *
 * Timing constants mirror `use-payment-watcher.ts` exactly, so the two share
 * one waiting UI without behaving differently underneath it.
 */

const EXPIRY_MS = 3 * 60 * 1000;

function delayFor(attempt: number): number {
  if (attempt < 3) return 500;
  if (attempt < 6) return 1000;
  if (attempt < 10) return 1500;
  return 2000;
}

const MISSING_TOLERANCE = 2;

export type CinemaOrderPhase = 'waiting' | 'issued' | 'cancelled' | 'failed' | 'timeout' | 'error';

export type CinemaOrderWatch = {
  phase: CinemaOrderPhase;
  order: CinemaOrder | null;
  message?: string;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useCinemaOrderWatcher(transactionId: string | undefined): CinemaOrderWatch {
  const [watch, setWatch] = useState<CinemaOrderWatch>({ phase: 'waiting', order: null });

  useEffect(() => {
    if (!transactionId) return;

    let cancelled = false;
    const startedAt = Date.now();

    async function collectOrder(): Promise<CinemaOrder | null> {
      try {
        const order = await fetchCinemaOrder(transactionId!);
        return order.tickets.length ? order : null;
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
            // Paid, but the tickets haven't been written yet — keep waiting.
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

/** Best-effort cancel for a watcher's caller — mirrors `cancelPayment`'s usage in `checkout/[txn].tsx`. */
export function abandonCinemaOrder(transactionId: string) {
  cancelCinemaCheckout(transactionId).catch(() => {
    // The server expires an unclaimed hold on its own, so a failed cancel changes nothing.
  });
}
