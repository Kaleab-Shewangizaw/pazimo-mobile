import type { Ionicons } from '@expo/vector-icons';
import type { ImageSourcePropType } from 'react-native';

import type { WalletDepositMethod, WalletEntry } from '@/types/api';

/** How each Chapa rail is shown on the Add money sheet. Ids are the backend's. */
export const DEPOSIT_METHODS: Record<
  WalletDepositMethod,
  { name: string; logo?: ImageSourcePropType; requiresPrefix?: '09' | '07'; card?: boolean }
> = {
  telebirr: { name: 'Telebirr', logo: require('@/assets/images/payments/telebirr.png'), requiresPrefix: '09' },
  cbebirr: { name: 'CBE Birr', logo: require('@/assets/images/payments/cbe.png') },
  mpesa: { name: 'M-Pesa', logo: require('@/assets/images/payments/mpesa.png'), requiresPrefix: '07' },
  awashbirr: { name: 'Awash', logo: require('@/assets/images/payments/awash.png') },
  boa_ussd: { name: 'Abyssinia' },
  card: { name: 'Card', logo: require('@/assets/images/payments/visa.png'), card: true },
};

export const ENTRY_LOOK: Record<
  WalletEntry['kind'],
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  deposit: { label: 'Added money', icon: 'arrow-down-circle' },
  payment: { label: 'Payment', icon: 'arrow-up-circle' },
  refund: { label: 'Refund', icon: 'return-down-back' },
  adjustment: { label: 'Adjustment by Pazimo', icon: 'construct' },
};

/** "in 3 h", "in 20 min" — for cool-off and lock countdowns. */
export function untilLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  const minutes = Math.max(1, Math.round((Date.parse(iso) - Date.now()) / 60000));
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `in ${hours} h`;
}

/** Same check the server makes on a new PIN, so the obvious ones are caught before sending. */
export function weakPinReason(pin: string): string | null {
  if (!/^\d{6}$/.test(pin)) return 'Use exactly 6 digits.';
  if (/^(\d)\1{5}$/.test(pin)) return 'Avoid repeating one digit.';
  if ('0123456789'.includes(pin) || '9876543210'.includes(pin)) return 'Avoid digits in order.';
  if (/^(\d\d)\1\1$/.test(pin) || /^(\d{3})\1$/.test(pin)) return 'Avoid repeating patterns.';
  return null;
}
