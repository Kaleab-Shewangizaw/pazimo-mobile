import type { Currency, PazimoEvent, TicketTier } from '@/types/api';

/** Mirrors `resolveTicketPrice` in backend/src/utils/pricing.js. */
export function tierUnitPrice(tier: TicketTier, currency: Currency): number {
  const preferred = currency === 'USD' ? tier.priceUSD : tier.priceETB;
  return preferred ?? tier.price ?? 0;
}

/** A tier is buyable only if the server says so *and* it has the stock. */
export function isTierBuyable(tier: TicketTier, quantity = 1): boolean {
  return tier.available && tier.quantity >= quantity;
}

/**
 * `Event.isSoldOut` exists on the model but is never written by any controller,
 * so availability has to be derived from the tiers.
 */
export function isSoldOut(event: Pick<PazimoEvent, 'ticketTypes'>): boolean {
  const tiers = event.ticketTypes ?? [];
  return tiers.length > 0 && !tiers.some((t) => t.available);
}

/** Currencies a given event can actually be bought in. */
export function availableCurrencies(event: Pick<PazimoEvent, 'ticketTypes'>): Currency[] {
  const tiers = event.ticketTypes ?? [];
  const currencies: Currency[] = [];
  if (tiers.some((t) => t.priceETB != null || t.price != null)) currencies.push('ETB');
  if (tiers.some((t) => t.priceUSD != null)) currencies.push('USD');
  return currencies.length ? currencies : ['ETB'];
}

export function lowestPrice(
  event: Pick<PazimoEvent, 'ticketTypes'>,
  currency: Currency,
): number | null {
  const prices = (event.ticketTypes ?? [])
    .filter((t) => t.available)
    .map((t) => tierUnitPrice(t, currency));
  return prices.length ? Math.min(...prices) : null;
}

const formatters: Partial<Record<Currency, Intl.NumberFormat>> = {};

export function formatPrice(amount: number, currency: Currency): string {
  if (amount === 0) return 'Free';
  formatters[currency] ??= new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatters[currency]!.format(amount);
}

/** "From ETB 250" / "Free" / null when nothing is on sale. */
export function priceLabel(
  event: Pick<PazimoEvent, 'ticketTypes'>,
  currency: Currency,
): string | null {
  const low = lowestPrice(event, currency);
  if (low === null) return null;
  if (low === 0) return 'Free';
  return `From ${formatPrice(low, currency)}`;
}
