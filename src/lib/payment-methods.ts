import type { ImageSourcePropType } from 'react-native';

import type { Currency, PaymentMethodId, PaymentProvider } from '@/types/api';

/**
 * The rails a buyer can pick, per provider.
 *
 * The two providers name the same four wallets differently — `"CBE Birr"` for
 * SantimPay, `"CBEBirr"` for Chapa — and the backend matches on those exact
 * strings, so the ids here are the wire format and must not be normalised.
 *
 * USD never uses these: it is forced through Chapa's hosted card checkout.
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
  visa: require('@/assets/images/payments/visa.png'),
  mastercard: require('@/assets/images/payments/mastercard.png'),
} as const;

const SANTIM_METHODS: PaymentMethod[] = [
  { id: 'Telebirr', name: 'Telebirr', logo: LOGOS.telebirr, requiresPrefix: '09' },
  { id: 'CBE Birr', name: 'CBE Birr', logo: LOGOS.cbe },
  { id: 'Mpesa', name: 'M-Pesa', logo: LOGOS.mpesa, requiresPrefix: '07' },
  { id: 'Awash Bank', name: 'Awash', logo: LOGOS.awash },
];

const CHAPA_METHODS: PaymentMethod[] = [
  { id: 'telebirr', name: 'Telebirr', logo: LOGOS.telebirr, requiresPrefix: '09' },
  { id: 'CBEBirr', name: 'CBE Birr', logo: LOGOS.cbe },
  { id: 'mpesa', name: 'M-Pesa', logo: LOGOS.mpesa, requiresPrefix: '07' },
  { id: 'AwashBirr', name: 'Awash', logo: LOGOS.awash },
];

const CARD_METHODS: PaymentMethod[] = [
  { id: 'visa', name: 'Visa', logo: LOGOS.visa },
  { id: 'mastercard', name: 'Mastercard', logo: LOGOS.mastercard },
];

export function methodsFor(currency: Currency, provider: PaymentProvider): PaymentMethod[] {
  if (currency === 'USD') return CARD_METHODS;
  return provider === 'CHAPA' ? CHAPA_METHODS : SANTIM_METHODS;
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
