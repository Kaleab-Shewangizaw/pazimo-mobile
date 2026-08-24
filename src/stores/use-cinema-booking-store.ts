import { create } from 'zustand';

import type { CinemaTicketType } from '@/types/api';

/**
 * The in-progress booking, carried across the seats → snacks → payment
 * screens. Seat arrays and a concessions basket don't fit cleanly into route
 * params, so this follows the same pattern as `use-auth-store`/`use-app-store`
 * rather than prop-drilling or a route-param-encoded basket.
 */

export type SelectedSeat = {
  seatKey: string;
  row: string;
  number: string;
  categoryKey: string;
  categoryLabel: string;
  ticketTypeId: string;
  price: number;
};

export type SelectedConcession = {
  cinemaBeverage: string;
  name: string;
  image?: string | null;
  unitPrice: number;
  quantity: number;
};

type CinemaBookingState = {
  showtimeId: string | null;
  cinemaId: string | null;
  movieTitle: string | null;
  posterUrl: string | null;
  assignedSeating: boolean | null;
  seats: SelectedSeat[];
  /** Capacity-only path: the showtime's tiers, carried from the movie page — the seat-map endpoint returns none of this for an unassigned hall. */
  ticketTypes: CinemaTicketType[];
  ticketTypeId: string | null;
  quantity: number;
  concessions: SelectedConcession[];
  startBooking: (args: {
    showtimeId: string;
    cinemaId: string;
    movieTitle: string;
    posterUrl?: string | null;
    ticketTypes?: CinemaTicketType[];
  }) => void;
  setSeats: (seats: SelectedSeat[]) => void;
  setUnassignedSelection: (ticketTypeId: string, quantity: number) => void;
  setConcessions: (list: SelectedConcession[]) => void;
  reset: () => void;
};

const initial: Pick<
  CinemaBookingState,
  | 'showtimeId'
  | 'cinemaId'
  | 'movieTitle'
  | 'posterUrl'
  | 'assignedSeating'
  | 'seats'
  | 'ticketTypes'
  | 'ticketTypeId'
  | 'quantity'
  | 'concessions'
> = {
  showtimeId: null,
  cinemaId: null,
  movieTitle: null,
  posterUrl: null,
  assignedSeating: null,
  seats: [],
  ticketTypes: [],
  ticketTypeId: null,
  quantity: 1,
  concessions: [],
};

export const useCinemaBookingStore = create<CinemaBookingState>()((set) => ({
  ...initial,
  // Resets everything else, so entering the flow for a different showtime
  // can never leak a previous selection.
  startBooking: ({ showtimeId, cinemaId, movieTitle, posterUrl, ticketTypes }) =>
    set({
      ...initial,
      showtimeId,
      cinemaId,
      movieTitle,
      posterUrl: posterUrl ?? null,
      ticketTypes: ticketTypes ?? [],
    }),
  setSeats: (seats) => set({ seats, assignedSeating: true }),
  setUnassignedSelection: (ticketTypeId, quantity) =>
    set({ ticketTypeId, quantity, assignedSeating: false }),
  setConcessions: (concessions) => set({ concessions }),
  reset: () => set({ ...initial }),
}));
