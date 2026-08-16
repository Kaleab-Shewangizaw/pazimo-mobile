import { getData, postRaw, getRaw } from '@/api/client';
import type {
  Currency,
  PaymentConfig,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  PaymentStatusResponse,
} from '@/types/api';

/**
 * Which provider ticket money currently flows through. Admin-switchable at
 * runtime, so it has to be read rather than baked in — and it decides both the
 * endpoint *and* the spelling of the method ids (see `PaymentMethodId`).
 */
export function fetchPaymentConfig(): Promise<PaymentConfig> {
  return getData<PaymentConfig>('/config/payment/active');
}

/**
 * Starts a purchase.
 *
 * Deliberately never sends `amount`. The server recomputes the price from the
 * event and, if a client-supplied amount disagrees, calls `flagTamperAttempt` —
 * which can permanently ban the payer's phone number. Omitting the field skips
 * that comparison entirely, so a stale cached price can't get a buyer banned.
 *
 * USD is Chapa-only (hosted card checkout, returns a `checkoutUrl`). ETB goes to
 * whichever provider is active; both push a prompt to the payer's phone and
 * return no URL.
 */
export function initiateTicketPayment(
  body: PaymentInitiateRequest,
  provider: 'CHAPA' | 'SANTIM',
): Promise<PaymentInitiateResponse> {
  const path =
    provider === 'CHAPA' ? '/tickets/ticket/initiate/chapa' : '/tickets/ticket/initiate';
  return postRaw<PaymentInitiateResponse>(path, body);
}

/**
 * The poll that actually mints the ticket. The webhook is best-effort — on a
 * localhost or firewalled backend it never lands — and this endpoint re-verifies
 * with the provider and fulfils the order itself, so it is the reliable path.
 *
 * A 404 means the payment record is gone, which the caller must treat as
 * terminal rather than as a transient error.
 */
export function fetchPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
  return getRaw<PaymentStatusResponse>('/payments/status', {
    params: { txn: transactionId },
  });
}

/** Marks a still-pending intent cancelled so an abandoned prompt stops polling. */
export function cancelPayment(transactionId: string): Promise<{ success: boolean }> {
  return postRaw<{ success: boolean }>('/payments/cancel', { transactionId });
}

/** Chapa forces USD through its own hosted checkout regardless of the active provider. */
export function providerFor(
  currency: Currency,
  active: PaymentConfig['activeProvider'],
): 'CHAPA' | 'SANTIM' {
  return currency === 'USD' ? 'CHAPA' : active;
}
