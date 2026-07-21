/** Single source of truth for cache keys, so invalidation never guesses. */
export const queryKeys = {
  events: {
    all: ['events'] as const,
    feed: () => [...queryKeys.events.all, 'feed'] as const,
    featured: () => [...queryKeys.events.all, 'featured'] as const,
    trending: () => [...queryKeys.events.all, 'trending'] as const,
    banner: () => [...queryKeys.events.all, 'banner'] as const,
    detail: (id: string) => [...queryKeys.events.all, 'detail', id] as const,
  },
  categories: ['categories'] as const,
  wishlist: ['wishlist'] as const,
  tickets: {
    all: ['tickets'] as const,
    mine: () => [...queryKeys.tickets.all, 'mine'] as const,
    public: (id: string) => [...queryKeys.tickets.all, 'public', id] as const,
  },
  rsvp: {
    all: ['rsvp'] as const,
    forms: () => [...queryKeys.rsvp.all, 'forms'] as const,
    form: (publicId: string) => [...queryKeys.rsvp.all, 'form', publicId] as const,
  },
  paymentConfig: ['payment-config'] as const,
} as const;
