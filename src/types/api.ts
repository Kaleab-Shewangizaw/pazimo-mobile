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
  /** `image` is a server path or full URL; run it through `resolveImageUrl`. */
  organizerProfile?: { organization?: string; image?: string | null };
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
  /** Manual organizer/admin override — exists on the model but no controller currently writes it. */
  isSoldOut?: boolean;
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
  /** Lowercased, `^[a-z0-9_]{4,20}$`, globally unique. Absent until set via `PUT /auth/update-username`. */
  username?: string;
  role: UserRole;
  isActive?: boolean;
  /** True once the phone number has been confirmed via a code — see `verifyRegisterOtp`/`verifyPhoneOtp`. Accounts created before this shipped default to false. */
  isPhoneVerified?: boolean;
  /** Self-serve login 2FA — requires `isPhoneVerified` first. Toggle via `updateOtpPreference`. */
  otpEnabled?: boolean;
  tickets?: string[];
  wishlist?: string[];
};

/**
 * Stored preferences only — the backend has no push-token/device
 * registration yet, so these don't gate any actual delivery today.
 */
export type NotificationPreferences = {
  ticketUpdates: boolean;
  chatMessages: boolean;
  promotions: boolean;
};

export type AuthPayload = { user: User; token: string };

export type PasswordResetChannel = 'email' | 'sms';

/**
 * `/auth/login` short-circuits into a second factor for organizer accounts
 * with 2FA enabled server-side, or for any customer who has turned on login
 * codes in account settings (`otpEnabled`), returning a masked destination
 * instead of a session. `/auth/register` uses this same shape unconditionally
 * — every new account must prove its phone number before it gets a token —
 * which is why `register()` in `api/auth.ts` returns this type too.
 */
export type LoginResult =
  | ({ requiresOtp: false } & AuthPayload)
  | {
      requiresOtp: true;
      email: string;
      channel: PasswordResetChannel;
      maskedDestination: string;
    };

export type PasswordResetRequestResult = {
  channel: PasswordResetChannel;
  maskedDestination: string;
  message: string;
};

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

/* ------------------------- ticket shares ---------------------------- */

/** `pending` is the only non-terminal state; every other one is final. */
export type ShareStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

/**
 * Search results carry no phone/email — exact-match search only resolves an
 * identity, never a contact detail. `username` is the handle people search by.
 */
export type ShareUser = Pick<User, '_id' | 'firstName' | 'lastName' | 'username'>;

/** A row from `/ticket-shares/contacts` — derived from share history, not a separate address book. */
export type ShareContact = {
  userId: string;
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  username?: string;
  lastSharedAt: string;
  shareCount: number;
};

/* ------------------------------ chat ------------------------------ */

/** What the most recent activity in a conversation was — picks the chat list's preview icon/copy. */
export type ConversationActivityKind =
  | 'MESSAGE'
  | 'TICKET'
  | 'BEVERAGE'
  | 'CINEMA_TICKET'
  | 'CINEMA_CONCESSION';

/** A row from `GET /conversations` — the Chats tab's data source, backend-authoritative (not client-derived from share history). */
export type ConversationSummary = {
  _id: string;
  counterparty: ShareUser;
  lastMessageAt: string;
  lastMessagePreview?: string;
  lastMessageSenderId: string;
  lastMessageKind: ConversationActivityKind;
  /** Messages sent TO me in this thread that I haven't opened yet — the Chats list's unread badge. */
  unreadCount: number;
};

/**
 * A single free-text chat message. The sender may edit their own message
 * afterward (`editedAt` gets set); deleting one removes it from history
 * entirely server-side, so a deleted message is never represented here at
 * all — there is no tombstone shape to render.
 */
export type Message = {
  _id: string;
  conversation: string;
  sender: ShareUser;
  recipient: ShareUser;
  text: string;
  createdAt: string;
  readAt?: string | null;
  editedAt?: string | null;
};

/** `DELETE /conversations/:id/messages/:messageId` — just enough to know which message is gone. */
export type DeletedMessageAck = { _id: string };

/** `GET /conversations/:counterpartyId/messages` — one page, newest-first. */
export type MessagesPage = {
  messages: Message[];
  /** The oldest message id in this page — pass as `before` to fetch the next (older) page. `null` once there's nothing older. */
  nextCursor: string | null;
};

/**
 * A chat's "contact card" — `GET /conversations/:id/contact-card`. `username`
 * is always present when set; `phoneNumber` is included by the server only
 * once both people have added each other as contacts (never sent, not just
 * falsy, otherwise) — never derive visibility from the field being absent
 * vs. empty on the client, the server already decided this.
 */
export type ContactCard = {
  _id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phoneNumber?: string;
  /** Whether *I* have added this person — not whether it's mutual. */
  isContact: boolean;
};

/** A row from `GET /conversations/contacts` — everyone this account has added. */
export type ContactSummary = ShareUser;

/** A row from `GET /conversations/blocked`. */
export type BlockedUser = ShareUser & { blockedAt: string };

/** The reduced ticket shape a share carries, not the full `Ticket`. */
export type ShareTicket = {
  _id: string;
  ticketId: string;
  ticketType: string;
  price: number;
  currency: Currency;
  status: TicketStatus;
  checkedIn: boolean;
  /** Only present on `resultingTicket` — how many admissions the recipient's new ticket carries. */
  ticketCount?: number;
  event: Pick<PazimoEvent, '_id' | 'title' | 'startDate'> & { location?: EventLocation };
};

/**
 * One ticket + quantity within a share. `resultingTicket` is null until the
 * share is accepted — for a `FULL` transfer it ends up being the same ticket
 * (ownership just moved); for `PARTIAL` it's a brand-new child ticket minted
 * for the recipient, with its own id and QR.
 */
export type ShareItem = {
  ticket: ShareTicket;
  quantity: number;
  transferType: 'FULL' | 'PARTIAL';
  resultingTicket: ShareTicket | null;
};

export type TicketShare = {
  _id: string;
  status: ShareStatus;
  message?: string;
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
  fromUser: ShareUser;
  toUser: ShareUser;
  items: ShareItem[];
};

/**
 * A row from `GET /tickets/transferable` — the ticket-attach picker's data
 * source.
 *
 * Field-naming trap: here `ticketId` is the Mongo `_id` (what `POST
 * /ticket-shares`'s `items[].ticketId` expects) — the *opposite* of `Ticket`
 * and `ShareTicket` above, where `ticketId` is the short human-readable code
 * and `_id` is the Mongo id. This endpoint's own contract, not a typo.
 */
export type TransferableTicket = {
  ticketId: string;
  /** The short QR-facing code — `Ticket.ticketId` elsewhere in this file. Display only. */
  publicTicketId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  ticketType: string;
  currency: Currency;
  price: number;
  capacity: number;
  transferableCapacity: number;
};

/* ------------------------ beverage (drink) shares ------------------------ */

/** Which ledger every `sale`/`resultingSale` in a `BeverageShare`'s items lives in. */
export type BeverageSalesContext = 'EVENT_BEVERAGE' | 'VENUE_BEVERAGE';

/** The reduced sale shape a share carries — `attachSaleDetails`'s populated view, not the full sale document. */
export type ShareSaleDetails = {
  _id: string;
  referenceNumber: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: Currency;
  status: 'confirmed' | 'refunded';
  redeemedAt?: string | null;
  soldAt: string;
  beverage?: { name: string; color?: string | null };
  /** Only populated on an `EVENT_BEVERAGE` share. */
  event?: { title: string; startDate: string; location?: EventLocation };
  /** Only populated on a `VENUE_BEVERAGE` share. */
  venue?: { name: string; venueType?: string; city?: string };
};

/**
 * One drink + quantity within a share. Mirrors `ShareItem`, but `sale`/
 * `resultingSale` are bare ids (no schema `ref` server-side — the target
 * collection depends on the parent `BeverageShare.salesContext`), so the
 * populated view rides alongside as `saleDetails`/`resultingSaleDetails`
 * rather than replacing the id field the way `ShareItem.ticket` does.
 */
export type BeverageShareItem = {
  sale: string;
  quantity: number;
  transferType: 'FULL' | 'PARTIAL';
  resultingSale: string | null;
  saleDetails: ShareSaleDetails | null;
  resultingSaleDetails: ShareSaleDetails | null;
};

export type BeverageShare = {
  _id: string;
  salesContext: BeverageSalesContext;
  status: ShareStatus;
  message?: string;
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
  fromUser: ShareUser;
  toUser: ShareUser;
  items: BeverageShareItem[];
};

/** A row from `GET /beverages/refill/transferable` — the drink-attach picker's data source, event and venue merged. */
export type TransferableBeverageSale = {
  saleId: string;
  salesContext: BeverageSalesContext;
  beverageName: string;
  title: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: Currency;
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

export type PaymentInitiateResponse = {
  success: true;
  transactionId: string;
  /** Only set for Chapa web checkout (visa/mastercard). Null for direct charge. */
  checkoutUrl?: string | null;
  message?: string;
};

export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'FAILED' | 'NOT_FOUND';

export type PaymentStatusResponse = {
  success: boolean;
  status: PaymentStatus;
  transactionId: string;
  ticketId?: string | null;
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

/**
 * A physical place events happen at, from `/api/event-venues/public` — an
 * admin-curated directory, not a link off any particular event. Unrelated to
 * `RefillVenueSummary`: that is a business account selling drinks, this is
 * just a name and an address someone can search for.
 */
export type EventVenue = {
  _id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
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
  /** Present on every read (Mongoose includes it by default) — needed to send this ticket to a friend. */
  _id: string;
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

/**
 * One concession sale on a paid order — the real `CinemaBeverageSale`
 * document, not the priced-basket snapshot `CinemaQuoteConcessionLine` is.
 * Carries an `_id` (needed to send this snack to a friend) and reflects a
 * later refund/collection, which a snapshot never could.
 */
export type CinemaOrderConcessionSale = {
  _id: string;
  referenceNumber: string;
  cinemaBeverage: string;
  beverageName: string;
  beverageColor?: string | null;
  beverageCategory?: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  currency: 'ETB';
  status: 'confirmed' | 'refunded';
  redeemedAt?: string | null;
  soldAt: string;
};

export type CinemaOrder = {
  transactionId: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  total: number;
  currency: 'ETB';
  tickets: CinemaTicket[];
  concessions: CinemaOrderConcessionSale[];
};

/* ------------------------- cinema (ticket/snack) shares ------------------------- */

/** Which collection every `item` in a `CinemaShare`'s items lives in. */
export type CinemaShareItemType = 'CINEMA_TICKET' | 'CINEMA_CONCESSION';

/**
 * The populated view of a cinema share's item — either a `CinemaTicket` or a
 * `CinemaBeverageSale` projection, depending on the parent share's
 * `itemType`. Loosely typed (most fields optional) rather than a
 * discriminated union: the two shapes are read in exactly one place
 * (`cinemaShareToViewModel`), which already knows which fields apply from
 * `itemType` and never needs the type checker to narrow it further.
 */
export type CinemaShareItemDetails = {
  _id: string;
  quantity: number;
  currency: Currency;
  // Ticket fields
  ticketId?: string;
  movieTitle?: string;
  hallName?: string;
  showtimeStartsAt?: string;
  ticketType?: string;
  status?: string;
  checkedIn?: boolean;
  movie?: { title: string; poster?: string | null };
  // Concession fields
  referenceNumber?: string;
  beverageName?: string;
  beverageColor?: string | null;
  beverageCategory?: string;
  unitPrice?: number;
  totalAmount?: number;
  redeemedAt?: string | null;
  soldAt?: string;
  // Shared
  cinema?: { name: string; city?: string };
};

/** One ticket/snack + quantity within a share. FULL-only — no `transferType`, no `resultingItem`, unlike `ShareItem`/`BeverageShareItem`. */
export type CinemaShareItem = {
  item: string;
  quantity: number;
  itemDetails: CinemaShareItemDetails | null;
};

export type CinemaShare = {
  _id: string;
  itemType: CinemaShareItemType;
  status: ShareStatus;
  message?: string;
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
  fromUser: ShareUser;
  toUser: ShareUser;
  items: CinemaShareItem[];
};

/** A row from `GET /cinemas/my-tickets/transferable` — the cinema-ticket-attach picker's data source. */
export type TransferableCinemaTicket = {
  _id: string;
  ticketId: string;
  movieTitle: string;
  hallName?: string;
  showtimeStartsAt: string;
  ticketType: string;
  quantity: number;
  currency: Currency;
  cinema?: { name: string; city?: string };
};

/** A row from `GET /cinemas/my-concessions/transferable` — the cinema-snack-attach picker's data source. */
export type TransferableCinemaConcession = {
  _id: string;
  beverageName: string;
  beverageColor?: string | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: Currency;
  cinema?: { name: string; city?: string };
};

/* ---------------------------- refill (beverages) ---------------------------- */

/** `GET /beverages/refill/events` — events I hold a valid ticket for AND that sell drinks. */
export type RefillEventSummary = {
  eventId: string;
  title: string;
  startDate: string;
  coverImages?: string[];
  beverageCount: number;
};

/** `GET /venues/refill` — venues currently selling drinks. */
export type RefillVenueSummary = {
  venueId: string;
  name: string;
  venueType?: string;
  city?: string;
  image?: string | null;
  beverageCount: number;
};

/** One buyable row in an event's or venue's line-up — the shared shape both refill-catalog endpoints return. */
export type RefillBeverageItem = {
  /** The EventBeverage/VenueBeverage row id — not the underlying Beverage id. */
  id: string;
  beverageId: string;
  name: string;
  image?: string | null;
  color?: string | null;
  price: number;
  currency: Currency;
  /** `stockTotal - sold`, already floored at 0 server-side. */
  remaining: number;
};

export type RefillEventCatalog = {
  success: true;
  data: RefillBeverageItem[];
  event: { _id: string; title: string; startDate: string };
};

export type RefillVenueCatalog = {
  success: true;
  data: RefillBeverageItem[];
  venue: { _id: string; name: string; venueType?: string; city?: string };
};

/** One basket line as `concessionBasketService` prices it — shared shape for both channels. */
export type RefillBasketLine = {
  beverageId: string;
  name: string;
  color?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  currency: Currency;
};

/** `POST .../checkout/quote` — what a basket would cost. Reserves nothing. */
export type RefillBasket = {
  salesContext: 'EVENT' | 'VENUE';
  lines: RefillBasketLine[];
  total: number;
  currency: Currency;
};

/** `POST .../checkout` request body — the priced basket plus who's paying. */
export type RefillCheckoutRequest = {
  items: { id: string; quantity: number }[];
  phoneNumber: string;
  customerName: string;
  customerEmail?: string;
  method: PaymentMethodId;
  origin?: string;
};

/** `POST .../checkout` response — starts a Chapa payment, same shape as `CinemaCheckoutStartResponse`. */
export type RefillCheckoutStartResponse = {
  transactionId: string;
  checkoutUrl: string | null;
  provider: string;
  action: 'redirect' | 'prompt';
  total: number;
  currency: Currency;
};

/** One drink a paid order produced. `referenceNumber` is what the buyer shows at the counter. */
export type RefillOrderSale = {
  /** Not excluded by the projection server-side, just previously undeclared here — needed to send this drink to a friend. */
  _id: string;
  referenceNumber: string;
  beverageName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'confirmed' | 'refunded';
  redeemedAt?: string | null;
  soldAt: string;
};

/** `GET .../refill/orders/:transactionId` — everything one paid order produced. */
export type RefillOrder = {
  transactionId: string;
  status: PaymentStatus;
  total: number;
  currency: Currency;
  sales: RefillOrderSale[];
};

/** `GET /beverages/refill/my-orders` — a thin row for the "Your orders" list, event and venue channels merged. */
export type RefillOrderSummary = {
  transactionId: string;
  channel: 'EVENT' | 'VENUE';
  status: PaymentStatus;
  total: number;
  currency: Currency;
  title: string;
  createdAt: string;
};
