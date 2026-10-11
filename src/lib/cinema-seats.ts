import type { CinemaTicket } from '@/types/api';

/**
 * Seat labels across a cinema order's tickets — "A12", "A13", … — in the
 * order they were bought. Each ticket carries a `seats` array (one ticket
 * per price category, however many chairs that is), so this flattens them.
 */
export function orderSeatLabels(tickets: CinemaTicket[]): string[] {
  return tickets.flatMap((t) => (t.seats ?? []).map((s) => `${s.row}${s.number}`));
}

/** Assigned seating: every ticket on the order names its chairs. */
export function isSeatedOrder(tickets: CinemaTicket[]): boolean {
  return tickets.length > 0 && tickets.every((t) => (t.seats?.length ?? 0) > 0);
}

/** The seatKeys an order holds — what the seat map highlights as "yours". */
export function orderSeatKeys(tickets: CinemaTicket[]): string[] {
  return tickets.flatMap((t) => (t.seats ?? []).map((s) => s.seatKey));
}
