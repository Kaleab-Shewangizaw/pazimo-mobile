import { getData, postData } from '@/api/client';
import type {
  BeverageSalesContext,
  BeverageShare,
  ShareStatus,
  TransferableBeverageSale,
} from '@/types/api';

/**
 * The drinks twin of `api/ticket-shares.ts` — same shape throughout, since
 * `BeverageShare` mirrors `TicketShare` on the backend. Recipient
 * search/contacts intentionally hit the SAME `/ticket-shares/*` endpoints as
 * the ticket flow (the backend reuses `ticketShareService.searchRecipients`
 * unchanged — it's a plain user lookup, nothing drink-specific about it), so
 * there is no `/beverage-shares/search` or `/beverage-shares/contacts` to
 * call here.
 */

export type BeverageShareItemInput = { saleId: string; quantity: number };

export async function createBeverageShare(payload: {
  toUserId: string;
  salesContext: BeverageSalesContext;
  items: BeverageShareItemInput[];
  message?: string;
  idempotencyKey?: string;
}): Promise<BeverageShare> {
  return postData<BeverageShare>('/beverage-shares', payload);
}

export type ShareDirection = 'sent' | 'received';

export async function fetchBeverageShares(
  params: { direction?: ShareDirection; status?: ShareStatus } = {},
): Promise<BeverageShare[]> {
  return getData<BeverageShare[]>('/beverage-shares', { params });
}

/** Recipient only. Ownership of the drink moves now. */
export async function acceptBeverageShare(shareId: string): Promise<BeverageShare> {
  return postData<BeverageShare>(`/beverage-shares/${shareId}/accept`);
}

/** Recipient only. */
export async function declineBeverageShare(shareId: string): Promise<BeverageShare> {
  return postData<BeverageShare>(`/beverage-shares/${shareId}/decline`);
}

/** Sender only, while still pending. */
export async function cancelBeverageShare(shareId: string): Promise<BeverageShare> {
  return postData<BeverageShare>(`/beverage-shares/${shareId}/cancel`);
}

/** Every drink this account currently holds that is free to send — the drink-attach picker's data source. */
export async function fetchTransferableBeverageSales(): Promise<TransferableBeverageSale[]> {
  return getData<TransferableBeverageSale[]>('/beverages/refill/transferable');
}
