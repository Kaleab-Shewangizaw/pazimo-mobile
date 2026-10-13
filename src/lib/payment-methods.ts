import type { ImageSourcePropType } from 'react-native';

import { resolveImageUrl } from '@/lib/media';
import type {
  Currency,
  PaymentMethodId,
  PaymentMethodOption,
  PaymentProvider,
} from '@/types/api';

/**
 * The rails a buyer can pick, per provider.
 *
 * Chapa's list comes from the server (Admin → Finance → Payment methods): which
 * methods, their names, their order, and whether they're switched on — the
 * same list the web selector shows. SantimPay's ids are the wire format it
 * matches on (`"CBE Birr"`, not `"CBEBirr"`), so its list stays here and only
 * the admin's on/off switches apply to it. USD is forced through Chapa's
 * hosted card checkout.
 */

export type PaymentMethod = {
  id: PaymentMethodId;
  name: string;
  logo: ImageSourcePropType;
  /**
   * Ethiopian mobile money is tied to the network that issued the number:
   * Telebirr is Ethio Telecom (09…), M-Pesa is Safaricom (07…). Paying from the
   * wrong one fails at the provider, so the mismatch is caught here instead.
   */
  requiresPrefix?: '09' | '07';
};

const LOGOS = {
  telebirr: require('@/assets/images/payments/telebirr.png'),
  cbe: require('@/assets/images/payments/cbe.png'),
  mpesa: require('@/assets/images/payments/mpesa.png'),
  awash: require('@/assets/images/payments/awash.png'),
  abyssinia: require('@/assets/images/payments/abyssinia.png'),
  visa: require('@/assets/images/payments/visa.png'),
  mastercard: require('@/assets/images/payments/mastercard.png'),
} as const;

/** Built-in methods ship their logo in the app: instant, and works offline. */
const BUNDLED_LOGOS: Record<string, ImageSourcePropType> = {
  telebirr: LOGOS.telebirr,
  cbebirr: LOGOS.cbe,
  cbe_ussd: LOGOS.cbe,
  mpesa: LOGOS.mpesa,
  awashbirr: LOGOS.awash,
  boa_ussd: LOGOS.abyssinia,
};

/** Mobile money tied to one network — see `PaymentMethod.requiresPrefix`. */
const REQUIRED_PREFIX: Record<string, '09' | '07'> = { telebirr: '09', mpesa: '07' };

/**
 * Fold any spelling of a method ("CBEBirr", "CBE Birr", "Awash Bank", "visa")
 * onto a server key. Mirrors the backend's `canonicalMethodKey`.
 */
export function canonicalMethodKey(method: string): string | null {
  const input = method.toLowerCase().trim();
  if (!input) return null;
  if (input === 'visa' || input === 'mastercard' || input === 'card') return 'card';
  // Before the CBE Birr check: both contain "cbe".
  if (input.includes('cbe') && input.includes('ussd')) return 'cbe_ussd';
  if (input.includes('cbe') || input.includes('commercial bank')) return 'cbebirr';
  if (input.includes('telebirr')) return 'telebirr';
  if (input === 'mpesa' || input === 'm-pesa') return 'mpesa';
  if (input.includes('awash')) return 'awashbirr';
  if (input.includes('boa') || input.includes('abyssinia')) return 'boa_ussd';
  return null;
}

function isAvailable(available: PaymentMethodOption[], id: string): boolean {
  const key = canonicalMethodKey(id);
  return available.some((m) => m.key === id.toLowerCase() || m.key === key);
}

/**
 * A logo an admin uploaded (`/uploads/...`) wins, so a new or changed logo
 * shows without an app release. Otherwise the bundled one. A method with
 * neither gets an empty white plate — its name still shows under it.
 */
function logoFor(option: PaymentMethodOption): ImageSourcePropType {
  const uploaded = option.image?.startsWith('/uploads/') ? resolveImageUrl(option.image) : null;
  if (uploaded) return { uri: uploaded };
  return BUNDLED_LOGOS[option.key] ?? {};
}

const SANTIM_METHODS: PaymentMethod[] = [
  { id: 'Telebirr', name: 'Telebirr', logo: LOGOS.telebirr, requiresPrefix: '09' },
  { id: 'CBE Birr', name: 'CBE Birr', logo: LOGOS.cbe },
  { id: 'Mpesa', name: 'M-Pesa', logo: LOGOS.mpesa, requiresPrefix: '07' },
  { id: 'Awash Bank', name: 'Awash', logo: LOGOS.awash },
];

const CARD_METHODS: PaymentMethod[] = [
  { id: 'visa', name: 'Visa', logo: LOGOS.visa },
  { id: 'mastercard', name: 'Mastercard', logo: LOGOS.mastercard },
];

/**
 * What to offer for this order. `available` is the server's list
 * (`usePaymentMethods`); while it is still loading this returns an empty list
 * and the payment step shows placeholders.
 */
export function methodsFor(
  currency: Currency,
  provider: PaymentProvider,
  available: PaymentMethodOption[] | undefined,
): PaymentMethod[] {
  if (!available) return [];
  if (currency === 'USD') return CARD_METHODS.filter((m) => isAvailable(available, m.id));
  if (provider === 'SANTIM') return SANTIM_METHODS.filter((m) => isAvailable(available, m.id));
  return available
    .filter((m) => m.kind === 'mobile')
    .map((m) => ({
      id: m.key,
      name: m.label,
      logo: logoFor(m),
      requiresPrefix: REQUIRED_PREFIX[m.key],
    }));
}

/** Digits only, with any Ethiopian country code or trunk zero stripped. */
export function localEthiopianDigits(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('251')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

/** What a nine-digit local number looks like once the trunk zero is back on. */
export function nationalEthiopianNumber(input: string): string {
  return `0${localEthiopianDigits(input)}`;
}

/**
 * The exact string each provider wants. They disagree: Chapa's direct charge
 * validates `09…`/`07…`, SantimPay wants `+251…`, and a card payment carries
 * whatever international number the buyer typed.
 */
export function formatPhoneForPayment(
  input: string,
  currency: Currency,
  provider: PaymentProvider,
): string {
  if (currency === 'USD') {
    const digits = input.replace(/[^\d+]/g, '');
    return digits.startsWith('+') ? digits : `+${digits}`;
  }
  const local = localEthiopianDigits(input);
  return provider === 'CHAPA' ? `0${local}` : `+251${local}`;
}

/** Null when the number is usable, otherwise the reason it isn't. */
export function phoneProblem(
  input: string,
  currency: Currency,
  method: PaymentMethod | null,
): string | null {
  if (currency === 'USD') {
    const digits = input.replace(/\D/g, '');
    return digits.length >= 8 ? null : 'Enter the phone number for your card.';
  }

  const local = localEthiopianDigits(input);
  if (local.length !== 9) return 'Enter a 9-digit Ethiopian number, e.g. 912 345 678.';
  if (!/^[79]/.test(local)) return 'Ethiopian mobile numbers start with 9 or 7.';

  if (method?.requiresPrefix) {
    const prefix = local.startsWith('9') ? '09' : '07';
    if (prefix !== method.requiresPrefix) {
      return `${method.name} only works with ${method.requiresPrefix}… numbers.`;
    }
  }
  return null;
}

/**
 * Checkout is guest-first, but the backend requires an email to create the
 * account a ticket hangs off. When the buyer doesn't give one, mint the same
 * placeholder shape the web does so the purchase still completes.
 */
export function checkoutEmail(input: string, accountEmail?: string): string {
  const typed = input.trim();
  if (typed) return typed;
  if (accountEmail) return accountEmail;
  const suffix = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  return `customerpazimo${suffix}@gmail.com`;
}
