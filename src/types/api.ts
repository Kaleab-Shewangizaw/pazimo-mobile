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
  | 'active'
  | 'used'
  | 'cancelled'
  | 'expired'
  | 'pending'
  | 'confirmed'
  | 'declined';

export type Ticket = {
  _id: string;
  /** 8-char human-readable id, and what the QR encodes. */
  ticketId: string;
  event: Pick<PazimoEvent, '_id' | 'title' | 'startDate'> & {
    endDate?: string;
    location?: EventLocation;
  };
  user?: string;
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
};

/* ---------------------------- payments ---------------------------- */

export type PaymentProvider = 'CHAPA' | 'SANTIM';

export type PaymentConfig = {
  activeProvider: PaymentProvider;
  giftCardMode: boolean;
};

export type PaymentInitiateResponse = {
  success: true;
  transactionId: string;
  /** Only set for Chapa web checkout (visa/mastercard). Null for direct charge. */
  checkoutUrl?: string | null;
  message?: string;
  /** Guest checkout auto-creates an account and returns its session here. */
  token?: string | null;
  user?: User | null;
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
  approvalMode: 'auto' | 'manual';
  collectAttendeeInfo: boolean;
  anonymous: boolean;
  sections: { id: string; title: string; order: number }[];
  questions: RsvpQuestion[];
  responseCount: number;
  isFeatured: boolean;
  isTrending: boolean;
  shareUrl?: string;
};

export type RsvpAnswer = string | number | boolean | string[] | null;

export type RsvpResponse = {
  _id: string;
  responseId: string;
  answers: Record<string, RsvpAnswer>;
  attendee: { fullName: string; email: string; phone: string };
  status: 'pending' | 'approved' | 'paid' | 'unpaid' | 'rejected';
  tag: 'VIP' | 'Guest' | 'Press';
  qrCodePayload: string;
  qrCodeDataUrl: string;
  submittedAt: string;
};
