/** Single source of truth for cache keys, so invalidation never guesses. */
export const queryKeys = {
  events: {
    all: ['events'] as const,
    feed: () => [...queryKeys.events.all, 'feed'] as const,
    detail: (id: string) => [...queryKeys.events.all, 'detail', id] as const,
  },
  categories: ['categories'] as const,
  wishlist: ['wishlist'] as const,
  tickets: {
    all: ['tickets'] as const,
    mine: () => [...queryKeys.tickets.all, 'mine'] as const,
    public: (id: string) => [...queryKeys.tickets.all, 'public', id] as const,
    transferable: () => [...queryKeys.tickets.all, 'transferable'] as const,
  },
  rsvp: {
    all: ['rsvp'] as const,
    forms: () => [...queryKeys.rsvp.all, 'forms'] as const,
    form: (publicId: string) => [...queryKeys.rsvp.all, 'form', publicId] as const,
  },
  cinemas: {
    all: ['cinemas'] as const,
    list: (city?: string, search?: string) =>
      [...queryKeys.cinemas.all, 'list', city ?? '', search ?? ''] as const,
    showtimes: (cinemaId: string) => [...queryKeys.cinemas.all, 'showtimes', cinemaId] as const,
    movie: (movieId: string) => [...queryKeys.cinemas.all, 'movie', movieId] as const,
    featuredMovies: () => [...queryKeys.cinemas.all, 'featured-movies'] as const,
  },
  eventVenues: {
    all: ['event-venues'] as const,
    list: (city?: string, search?: string) =>
      [...queryKeys.eventVenues.all, 'list', city ?? '', search ?? ''] as const,
  },
  cinemaCheckout: {
    seats: (showtimeId: string) => ['cinema-checkout', 'seats', showtimeId] as const,
    concessions: (cinemaId: string) => ['cinema-checkout', 'concessions', cinemaId] as const,
    order: (transactionId: string) => ['cinema-checkout', 'order', transactionId] as const,
    myOrders: () => ['cinema-checkout', 'my-orders'] as const,
  },
  paymentConfig: ['payment-config'] as const,
  shares: {
    all: ['shares'] as const,
    list: (direction?: string, status?: string) =>
      [...queryKeys.shares.all, 'list', direction ?? 'all', status ?? 'all'] as const,
    contacts: () => [...queryKeys.shares.all, 'contacts'] as const,
    search: (q: string) => [...queryKeys.shares.all, 'search', q] as const,
  },
  beverageShares: {
    all: ['beverage-shares'] as const,
    list: (direction?: string, status?: string) =>
      [...queryKeys.beverageShares.all, 'list', direction ?? 'all', status ?? 'all'] as const,
    transferable: () => [...queryKeys.beverageShares.all, 'transferable'] as const,
  },
  cinemaShares: {
    all: ['cinema-shares'] as const,
    list: (direction?: string, status?: string) =>
      [...queryKeys.cinemaShares.all, 'list', direction ?? 'all', status ?? 'all'] as const,
    transferableTickets: () => [...queryKeys.cinemaShares.all, 'transferable-tickets'] as const,
    transferableConcessions: () =>
      [...queryKeys.cinemaShares.all, 'transferable-concessions'] as const,
  },
  refill: {
    all: ['refill'] as const,
    events: () => [...queryKeys.refill.all, 'events'] as const,
    eventCatalog: (eventId: string) => [...queryKeys.refill.all, 'event', eventId] as const,
    venues: () => [...queryKeys.refill.all, 'venues'] as const,
    venueCatalog: (venueId: string) => [...queryKeys.refill.all, 'venue', venueId] as const,
    myOrders: () => [...queryKeys.refill.all, 'my-orders'] as const,
  },
  conversations: {
    all: ['conversations'] as const,
    list: () => [...queryKeys.conversations.all, 'list'] as const,
    messages: (counterpartyId: string) =>
      [...queryKeys.conversations.all, 'messages', counterpartyId] as const,
    contactCard: (counterpartyId: string) =>
      [...queryKeys.conversations.all, 'contact-card', counterpartyId] as const,
    contactsList: () => [...queryKeys.conversations.all, 'contacts-list'] as const,
    blocked: () => [...queryKeys.conversations.all, 'blocked'] as const,
  },
  account: {
    notificationPreferences: ['account', 'notification-preferences'] as const,
  },
} as const;
