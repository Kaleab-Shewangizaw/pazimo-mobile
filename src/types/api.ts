/**
 * Mirrors the Mongoose models in pazimo/backend/src/models.
 * Fields marked optional are genuinely absent on some responses — public
 * endpoints run payloads through `sanitizePublicEvent`, which strips organizer
 * contact details and the ticket-wave scheduling fields.
 */

export type Currency = 'ETB' | 'USD';

export type Category = {
  _id: string;
  name: string;
  description: string;
  /** Server path like `/uploads/x.png`, or null. There is no `icon` field. */
  image: string | null;
  isPublished: boolean;
};

export type TicketTier = {
  _id: string;
  name: string;
  /** Legacy single price, used as the fallback for both currencies. */
  price?: number;
  priceETB?: number;
  priceUSD?: number;
  /** Remaining stock. There is no separate `sold` or `remaining` field. */
  quantity: number;
  description?: string;
  /** Server-computed from stock, sale window, manual override and wave rules. */
  available: boolean;
};

export type EventLocation = {
  type: 'Point';
  coordinates: [number, number];
  address?: string;
  city?: string;
  country?: string;
};

export type EventOrganizer = {
  _id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  organizerProfile?: { organization?: string };
};

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export type PazimoEvent = {
  _id: string;
  id?: string;
  title: string;
  slug?: string;
  /** 4-char public lookup key. The slug is cosmetic and has no lookup endpoint. */
  shortId?: string;
  description: string;
  /** Populated to `{_id,name,description}` on public reads; an id string elsewhere. */
  category: Category | string | null;
  isPublic: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  bannerStatus: boolean;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: EventLocation;
  organizer?: EventOrganizer | string;
  coverImages: string[];
  eventImages?: { url: string; caption?: string }[];
  ticketTypes: TicketTier[];
  status: EventStatus;
  capacity?: number;
  tags?: string[];
  ageRestriction?: { hasRestriction: boolean; minAge?: number; maxAge?: number };
  /** Present only on `GET /api/events`. */
  ticketsSold?: number;
  createdAt: string;
  updatedAt: string;
};

/** `GET /api/events` — the only page/limit paginated endpoint in the API. */
export type PagedEnvelope = { total: number; page: number; pages: number };

/** `GET /api/events/public-events` — offset style. */
export type OffsetMeta = {
  total: number;
  limit?: number;
  skip?: number;
  hasMore: boolean;
};

/* ------------------------------ auth ------------------------------ */

export type UserRole = 'customer' | 'organizer' | 'admin';

export type User = {
  _id: string;
  id?: string;
  email: string;
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  role: UserRole;
  isActive?: boolean;
  tickets?: string[];
  wishlist?: string[];
};

export type AuthPayload = { user: User; token: string };

/* ----------------------------- tickets ---------------------------- */

/**
 * Seven values, not three. Nothing in the backend ever writes `expired` or
 * `used` — `checkedIn` is the real "already used" signal.
 */
export type TicketStatus =
  'active' | 'used' | 'cancelled' | 'expired' | 'pending' | 'confirmed' | 'declined';

export type Ticket = {
  _id: string;
  /** 8-char human-readable id, and what the QR encodes. */
  ticketId: string;
  /**
   * `my-tickets` populates only `title startDate endDate location`; the public
   * lookup adds times, cover art and the organizer. Everything past the first
   * three fields is therefore optional at the type level.
   *
   * Non-null only because `src/api/tickets.ts` substitutes a stand-in for the
   * `null` the server sends when the event has been deleted — read it directly,
   * but do not fetch tickets around that module.
   */
  event: Pick<PazimoEvent, '_id' | 'title' | 'startDate'> & {
    endDate?: string;
    startTime?: string;
    endTime?: string;
    location?: EventLocation;
    coverImages?: string[];
    organizer?: EventOrganizer | string;
  };
  /** An id string on `my-tickets`; populated to a name/email on the public read. */
  user?: string | Pick<User, 'firstName' | 'lastName' | 'email'>;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  /** The tier *name*, not an id. */
  ticketType: string;
  /** Total paid for the purchase, not the unit price. */
  price: number;
  currency: Currency;
  purchaseDate: string;
  status: TicketStatus;
  paymentStatus: 'pending' | 'completed' | 'failed';
  ticketCount: number;
  purchaseQuantity: number;
  paymentReference?: string;
  checkedIn: boolean;
  checkedAt?: string;
  /** `data:image/svg+xml;base64,...` — SVG, so RN `<Image>` cannot render it. */
  qrCode?: string;
  isInvitation: boolean;
  createdAt: string;
  /** Only on `GET /api/tickets/public/details/:id` — stock left in this tier. */
  ticketsRemaining?: number | null;
};

/* ---------------------------- payments ---------------------------- */

export type PaymentProvider = 'CHAPA' | 'SANTIM';

export type PaymentConfig = {
  activeProvider: PaymentProvider;
  giftCardMode: boolean;
  giftCardRouting?: { ETB: string | null; USD: string | null };
};

/**
 * The wire ids the two providers accept for the same four mobile-money rails.
 * They differ in spelling *and* case, and the backend matches on them, so these
 * strings are the contract — do not normalise them.
 */
export type SantimMethod = 'Telebirr' | 'CBE Birr' | 'Mpesa' | 'Awash Bank';
export type ChapaMethod = 'telebirr' | 'CBEBirr' | 'mpesa' | 'AwashBirr';
/** USD always routes through Chapa's hosted card checkout. */
export type CardMethod = 'visa' | 'mastercard';
export type PaymentMethodId = SantimMethod | ChapaMethod | CardMethod;

export type PaymentInitiateRequest = {
  currency: Currency;
  paymentReason: string;
  phoneNumber: string;
  orderId: string;
  method: PaymentMethodId;
  ticketDetails: {
    ticketId: string;
    eventId: string;
    ticketTypeId: string;
    quantity: number;
    userId?: string;
    fullName: string;
    email: string;
  };
  /**
   * Chapa's `return_url` for card checkout. Left unset on mobile: the app never
   * relies on the redirect (it polls the payment either way), and a custom
   * `pazimomobile://` scheme is not something Chapa's URL validation is
   * documented to accept. Omitting it lets the backend supply its own web page.
   */
  successUrl?: string;
};

/**
 * The `user` here is the initiate route's own projection: it carries `id` but
 * not `_id`, unlike every other user payload in the API.
 */
export type PaymentInitiateUser = Omit<User, '_id'> & { id: string };

export type PaymentInitiateResponse = {
  success: true;
  transactionId: string;
  /** Only set for Chapa web checkout (visa/mastercard). Null for direct charge. */
  checkoutUrl?: string | null;
  message?: string;
  /** Guest checkout auto-creates an account and returns its session here. */
  token?: string | null;
  user?: PaymentInitiateUser | null;
};

export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'FAILED' | 'NOT_FOUND';

export type PaymentStatusResponse = {
  success: boolean;
  status: PaymentStatus;
  transactionId: string;
  ticketId?: string | null;
  newUserCredentials?: { email: string; password: string } | null;
};

/* ------------------------------ rsvp ------------------------------ */

export type RsvpQuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multi_choice'
  | 'dropdown'
  | 'phone'
  | 'email'
  | 'file'
  | 'date'
  | 'rating'
  | 'emoji'
  | 'nps'
  | 'yes_no';

export type RsvpQuestion = {
  id: string;
  label: string;
  type: RsvpQuestionType;
  required: boolean;
  options?: string[];
  /** Numeric comparison against another question's answer. */
  conditional?: { questionId: string; operator: 'lt' | 'eq' | 'gt'; value: number };
  sectionId: string;
  order: number;
};

export type RsvpForm = {
  _id: string;
  formId: string;
  /** The public lookup key (uuid v4). */
  publicId: string;
  title: string;
  description: string;
  type: 'rsvp' | 'review';
  status: string;
  coverImage: string;
  /** Free-form string, not a Date. */
  date: string;
  hostedBy: string;
  startTime: string;
  endTime: string;
  location: string;
  venue: string;
  /** Stored but never enforced server-side — do not gate submission on it. */
  rsvpLimit?: number;
  approvalMode: 'auto' | 'manual';
  collectAttendeeInfo: boolean;
  anonymous: boolean;
  isPublic: boolean;
  isClosed: boolean;
  bannerStatus: boolean;
  sections: { id: string; title: string; order: number }[];
  questions: RsvpQuestion[];
  responseCount: number;
  viewCount: number;
  isFeatured: boolean;
  isTrending: boolean;
  shareUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type RsvpAnswer = string | number | boolean | string[] | null;

export type RsvpResponse = {
  _id: string;
  responseId: string;
  formId: string;
  formPublicId: string;
  answers: Record<string, RsvpAnswer>;
  attendee: { fullName: string; email: string; phone: string };
  status: 'pending' | 'approved' | 'paid' | 'unpaid' | 'rejected';
  tag: 'VIP' | 'Guest' | 'Press';
  qrCodePayload: string;
  qrCodeDataUrl: string;
  checkedIn: boolean;
  checkedInAt?: string;
  submittedAt: string;
};

/**
 * Cinemas and their programme, from `/api/cinemas/public/*`.
 *
 * The public projections are deliberately narrow server-side — commission
 * rates, VAT coverage and the owning account are stripped before they leave the
 * controller — so these types are the whole of what a customer can ever see.
 */
export type Cinema = {
  _id: string;
  name: string;
  description?: string;
  city?: string;
  address?: string;
  phoneNumber?: string;
  /** Server path or full URL; run it through `resolveImageUrl`. */
  image?: string | null;
};

export type CinemaMovie = {
  _id: string;
  title: string;
  slug?: string;
  shortId?: string;
  poster?: string | null;
  durationMinutes?: number;
  ageRating?: string;
  genre?: string[] | string;
  language?: string;
  subtitles?: string;
  description?: string;
  /** Earliest upcoming screening, ISO. Added by the grouping aggregate. */
  nextShowtime?: string;
  /** How many screenings are still to come. */
  upcomingCount?: number;
  /** Cheapest seat across those screenings, or null when none is priced. */
  fromPrice?: number | null;
  /** Populated (`{_id,name,city,image}`) only on the featured/trending/banner rows, which span every cinema. */
  cinema?: Cinema;
  /** Only on the featured/trending/banner rows. */
  coverImage?: string | null;
};

export type CinemaHall = {
  _id: string;
  name: string;
  screenType?: string;
};

export type CinemaTicketType = {
  _id: string;
  name: string;
  price: number;
  description?: string;
  seatsRemaining: number;
};

/**
 * A single screening. `movie` and `hall` arrive populated, and `ticketTypes` is
 * pre-filtered server-side to the ones actually on sale — an unavailable tier is
 * simply absent rather than flagged.
 */
export type CinemaShowtime = {
  _id: string;
  cinema: string;
  movie: CinemaMovie;
  hall?: CinemaHall;
  startsAt: string;
  endsAt?: string;
  currency: 'ETB';
  ticketTypes: CinemaTicketType[];
};

/** The extra fields only the single-film endpoint returns. */
export type CinemaMovieDetail = CinemaMovie & {
  coverImage?: string | null;
  trailerUrl?: string | null;
  releaseDate?: string | null;
  status?: 'coming_soon' | 'now_showing' | 'archived';
};

export type CinemaShowtimeSlot = {
  _id: string;
  startsAt: string;
  endsAt?: string;
  currency: 'ETB';
  hall?: CinemaHall;
  ticketTypes: CinemaTicketType[];
  /** Server-computed so the client never disagrees with it by summing tiers. */
  soldOut: boolean;
};

export type CinemaMovieDay = {
  /** `YYYY-MM-DD`, in the cinema's own local reckoning. */
  date: string;
  showtimes: CinemaShowtimeSlot[];
};

export type CinemaMoviePage = {
  movie: CinemaMovieDetail;
  cinema: Cinema;
  days: CinemaMovieDay[];
  fromPrice: number | null;
  upcomingCount: number;
};

/**
 * Buying a cinema ticket, from `/api/cinemas/public/{showtimes,checkout,orders}/*`.
 *
 * `curve`/`offset` on a row are arbitrary renderer-scaled units (see
 * `CinemaHall.seatMap.rows` server-side) — purely presentational, and never
 * part of a seat's identity. `seatKey` (`"${row}-${number}"`) is that identity,
 * computed identically on both sides.
 */
export type CinemaSeatStatus = 'gap' | 'blocked' | 'sold' | 'held' | 'available';

export type CinemaSeatCategory = {
  key: string;
  label: string;
  color: string;
  /** Only present once the showtime's tiers actually price this category. */
  ticketTypeId?: string;
  name?: string;
  price?: number;
  isAvailable?: boolean;
};

export type CinemaSeat = {
  number: string;
  seatKey: string;
  categoryKey: string;
  exists: boolean;
  status: CinemaSeatStatus;
};

export type CinemaSeatRow = {
  label: string;
  curve: number;
  offset: number;
  seats: CinemaSeat[];
};

export type CinemaSeatMap =
  | { assignedSeating: false; showtimeId: string }
  | {
      assignedSeating: true;
      showtimeId: string;
      currency: 'ETB';
      holdMinutes: number;
      categories: CinemaSeatCategory[];
      rows: CinemaSeatRow[];
      /** True when the hall has a map but this showtime's tiers don't price its categories yet. */
      needsRepricing: boolean;
    };

export type CinemaConcessionItem = {
  _id: string;
  beverage: {
    name: string;
    image?: string | null;
    color?: string;
    category?: string;
    isActive: boolean;
  };
  price: number;
  currency: 'ETB';
  inStock: boolean;
  isAvailable: boolean;
};

export type CinemaBasketConcession = { cinemaBeverage: string; quantity: number };

/** Assigned-seating halls send `seats`; capacity-only halls send `ticketType` + `quantity`. */
export type CinemaCheckoutBasket = {
  showtime: string;
  seats?: string[];
  ticketType?: string;
  quantity?: number;
  concessions?: CinemaBasketConcession[];
};

export type CinemaQuoteTicketLine = {
  seatKey?: string;
  row?: string;
  number?: string;
  categoryKey?: string;
  categoryLabel?: string;
  ticketTypeId: string;
  ticketType: string;
  price: number;
};

export type CinemaQuoteConcessionLine = {
  cinemaBeverage: string;
  name: string;
  image?: string | null;
  category?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

/** Server-recomputed total — never trust or send a client-side price alongside a basket. */
export type CinemaCheckoutQuote = {
  showtimeId: string;
  cinemaId: string;
  movieTitle: string;
  startsAt: string;
  assignedSeating: boolean;
  currency: 'ETB';
  tickets: CinemaQuoteTicketLine[];
  ticketTotal: number;
  concessions: CinemaQuoteConcessionLine[];
  concessionTotal: number;
  total: number;
};

export type CinemaCheckoutStartRequest = CinemaCheckoutBasket & {
  phoneNumber: string;
  customerName: string;
  customerEmail?: string;
  method: PaymentMethodId;
  origin?: string;
};

export type CinemaCheckoutStartResponse = {
  transactionId: string;
  /** Only set for Chapa web checkout (cards). Null for a direct-charge prompt. */
  checkoutUrl: string | null;
  provider: string;
  action: 'redirect' | 'prompt';
  total: number;
  currency: 'ETB';
  /** So the payment screen can react if the seat hold lapses before paying finishes. */
  expiresAt: string;
  seats: string[];
};

export type CinemaTicket = {
  ticketId: string;
  movieTitle: string;
  hallName?: string;
  showtimeStartsAt: string;
  ticketType: string;
  price: number;
  quantity: number;
  totalAmount: number;
  currency: 'ETB';
  /** Absent on capacity-only halls — that ticket admits to the room, not a chair. */
  seat?: { row: string; number: string; seatKey: string; categoryKey: string; categoryLabel: string };
  status: 'active' | 'used' | 'cancelled' | 'refunded' | 'expired';
  paymentStatus: 'pending' | 'completed' | 'failed';
  purchaseDate: string;
  movie: { _id: string; title: string; poster?: string | null };
  cinema: { _id: string; name: string; address?: string; city?: string };
};

export type CinemaOrder = {
  transactionId: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  total: number;
  currency: 'ETB';
  tickets: CinemaTicket[];
  concessions: CinemaQuoteConcessionLine[];
};
