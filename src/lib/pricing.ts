import { isPast } from '@/lib/date';
import type { Currency, PazimoEvent, TicketTier } from '@/types/api';

/** Mirrors `resolveTicketPrice` in backend/src/utils/pricing.js. */
export function tierUnitPrice(tier: TicketTier, currency: Currency): number {
  const preferred = currency === 'USD' ? tier.priceUSD : tier.priceETB;
  return preferred ?? tier.price ?? 0;
}

/**
 * Wave metadata (waveGroup/waveOrder/waveSwitchMode/dates) never reaches the
 * client — the server has already resolved which wave is active and reports
 * it through `available`. So a tier is only ever judged on the two fields it
 * actually sends: whether it's the on-sale one, and whether stock remains.
 */
export function isTierBuyable(tier: TicketTier, quantity = 1): boolean {
  return tier.available !== false && tier.quantity >= quantity;
}

/** A price exists for the currency if the tier carries that field (or the legacy ETB-denominated fallback, for ETB only — see `availableCurrencies`). */
function tierHasPrice(tier: TicketTier, currency: Currency): boolean {
  return currency === 'USD' ? tier.priceUSD != null : tier.priceETB != null || tier.price != null;
}

/**
 * The tiers actually worth showing in a picker: on-sale (or unflagged) and
 * priced in the currency the buyer has selected. There's no "coming soon"
 * preview for a wave the server hasn't activated yet — it's simply absent,
 * matching the web app's `ticketsToDisplay`.
 */
export function ticketsToDisplay(tiers: TicketTier[], currency: Currency): TicketTier[] {
  return tiers.filter((t) => t.available !== false && tierHasPrice(t, currency));
}

/**
 * Mirrors the web app's `isEventSoldOut`: a manual override, a non-published
 * event, an event that has already ended, or a tier list with nothing left to
 * sell all count as sold out. `Event.isSoldOut` exists on the model but is
 * currently never written by any controller, so it's checked defensively
 * rather than relied on.
 */
export function isSoldOut(
  event: Pick<PazimoEvent, 'ticketTypes' | 'status' | 'startDate' | 'endDate' | 'isSoldOut'>,
): boolean {
  if (event.isSoldOut === true) return true;
  if (event.status !== 'published') return true;
  if (isPast(event.endDate ?? event.startDate)) return true;

  const tiers = event.ticketTypes ?? [];
  return !tiers.some((t) => t.available !== false && t.quantity > 0);
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
    .filter((t) => t.available !== false)
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
