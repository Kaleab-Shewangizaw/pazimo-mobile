import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { ApiError } from '@/api/client';
import { fetchPaymentStatus } from '@/api/payments';
import { fetchPublicTickets } from '@/api/tickets';
import { rememberDeviceTickets } from '@/lib/device-tickets';
import { queryKeys } from '@/queries/keys';
import type { Ticket } from '@/types/api';

/**
 * Watches a payment through to a ticket.
 *
 * This poll is not a progress bar — it is the mechanism. `GET /payments/status`
 * re-verifies with the provider and fulfils the order itself, which is what
 * mints the ticket whenever the webhook does not land (and on a backend that
 * isn't publicly reachable, it never does).
 *
 * Timing follows the two server-side rules that bound it: a direct charge is
 * auto-cancelled after three minutes, and the status endpoint does one provider
 * check per call for those — so polling faster than the user can act on their
 * phone only burns provider quota.
 */

const EXPIRY_MS = 3 * 60 * 1000;

/** Fast while a redirect might already have completed, then settling down. */
function delayFor(attempt: number): number {
  if (attempt < 3) return 500;
  if (attempt < 6) return 1000;
  if (attempt < 10) return 1500;
  return 2000;
}

/** The record is written before initiate responds, so a 404 is near-certainly real. */
const MISSING_TOLERANCE = 2;

export type PaymentPhase = 'waiting' | 'issued' | 'cancelled' | 'failed' | 'timeout' | 'error';

export type PaymentWatch = {
  phase: PaymentPhase;
  tickets: Ticket[];
  message?: string;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function usePaymentWatcher(transactionId: string | undefined): PaymentWatch {
  const queryClient = useQueryClient();
  const [watch, setWatch] = useState<PaymentWatch>({ phase: 'waiting', tickets: [] });

  useEffect(() => {
    if (!transactionId) return;

    let cancelled = false;
    const startedAt = Date.now();

    // Not every COMPLETED response carries a ticket id, and tickets can be
    // written a beat after the payment flips — so both lookups are tried, and
    // an empty result is treated as "not yet" rather than as failure.
    async function collectTickets(ticketId?: string | null): Promise<Ticket[]> {
      for (const reference of [ticketId, transactionId]) {
        if (!reference) continue;
        try {
          const found = await fetchPublicTickets(reference);
          if (found.length) return found;
        } catch {
          // 404 until the ticket lands; the caller retries.
        }
      }
      return [];
    }

    async function poll() {
      let attempt = 0;
      let missing = 0;

      while (!cancelled) {
        if (Date.now() - startedAt > EXPIRY_MS) {
          setWatch({ phase: 'timeout', tickets: [] });
          return;
        }

        try {
          const status = await fetchPaymentStatus(transactionId!);
          if (cancelled) return;

          if (status.status === 'COMPLETED') {
            const tickets = await collectTickets(status.ticketId);
            if (cancelled) return;

            if (tickets.length) {
              // Recorded before the reveal so a backgrounded app or a crash on
              // the way to the ticket screen can't lose a paid-for ticket.
              await rememberDeviceTickets(tickets.map((ticket) => ticket.ticketId));
              queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
              if (!cancelled) setWatch({ phase: 'issued', tickets });
              return;
            }
            // Paid, but the ticket write hasn't shown up yet — keep waiting.
          } else if (status.status === 'CANCELLED') {
            setWatch({
              phase: 'cancelled',
              tickets: [],
              message: 'The payment was cancelled. Nothing has been charged.',
            });
            return;
          } else if (status.status === 'FAILED') {
            setWatch({
              phase: 'failed',
              tickets: [],
              message: 'The payment did not go through. Check your balance and try again.',
            });
            return;
          } else if (status.status === 'NOT_FOUND') {
            missing += 1;
            if (missing > MISSING_TOLERANCE) {
              setWatch({ phase: 'failed', tickets: [], message: 'We could not find that payment.' });
              return;
            }
          }
        } catch (error) {
          if (cancelled) return;
          if (error instanceof ApiError && error.status === 404) {
            missing += 1;
            if (missing > MISSING_TOLERANCE) {
              setWatch({ phase: 'failed', tickets: [], message: 'We could not find that payment.' });
              return;
            }
          } else if (error instanceof ApiError && error.isBanned) {
            setWatch({ phase: 'error', tickets: [], message: error.message });
            return;
          }
          // Anything else is transport noise. The payment is still running on
          // the payer's phone, so dropping out here would strand a real charge.
        }

        await wait(delayFor(attempt));
        attempt += 1;
      }
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, [transactionId, queryClient]);

  return watch;
}
