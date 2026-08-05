import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type PaymentMethod, phoneProblem } from '@/lib/payment-methods';
import { formatPrice } from '@/lib/pricing';
import type { Currency, PaymentMethodId } from '@/types/api';

/**
 * Step two of the sheet: how to pay, and who is paying.
 *
 * Deliberately the same sheet rather than a screen. Choosing a tier and paying
 * for it are one decision, and pushing a route here would put a back stack
 * between the buyer and a purchase they have already committed to.
 *
 * How much it asks for depends on whether we already know the buyer. A returning
 * customer sees a method and a number and nothing else — their name and email
 * are on the account, and re-typing them is pure friction on the one screen
 * where friction costs a sale. A guest gets the full set, because the backend
 * cannot create the account a ticket hangs off without them.
 *
 * The phone stays even for known buyers: it is the number the payment prompt is
 * pushed to, which is not necessarily the number the account was opened with —
 * the backend stores `paymentPhone` separately for exactly that reason.
 */

export type BuyerDetails = {
  fullName: string;
  phone: string;
  email: string;
};

export type PaymentStepProps = {
  methods: PaymentMethod[];
  selectedMethod: PaymentMethodId | null;
  onSelectMethod: (id: PaymentMethodId) => void;
  details: BuyerDetails;
  onChangeDetails: (details: BuyerDetails) => void;
  /** The signed-in buyer's name, when there is one. Hides the identity fields. */
  knownAs?: string | null;
  currency: Currency;
  total: number;
  summary: string;
  /** Set once the buyer has tried to pay, so errors don't nag mid-typing. */
  showErrors: boolean;
  submitting: boolean;
  error?: string | null;
  onPay: () => void;
};

function PaymentStepImpl({
  methods,
  selectedMethod,
  onSelectMethod,
  details,
  onChangeDetails,
  knownAs,
  currency,
  total,
  summary,
  showErrors,
  submitting,
  error,
  onPay,
}: PaymentStepProps) {
  const theme = useTheme();
  const method = methods.find((m) => m.id === selectedMethod) ?? null;
  const isCard = currency === 'USD';

  const nameError = details.fullName.trim().length >= 2 ? null : 'Enter the name on the ticket.';
  const phoneError = phoneProblem(details.phone, currency, method);

  return (
    <View style={styles.container}>
      <View style={[styles.summary, { backgroundColor: theme.brandTint }]}>
        <Text variant="small" color="textSecondary" numberOfLines={1} style={styles.summaryText}>
          {summary}
        </Text>
        <Text variant="callout">{formatPrice(total, currency)}</Text>
      </View>

      <View style={styles.section}>
        <Text variant="caption" color="textSecondary">
          {isCard ? 'Pay with card' : 'Pay with'}
        </Text>
        <View style={styles.methodRow}>
          {methods.map((option) => {
            const active = option.id === selectedMethod;
            return (
              <Touchable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={option.name}
                onPress={() => onSelectMethod(option.id)}
                haptic
                pressedScale={0.95}
                style={[
                  styles.method,
                  {
                    backgroundColor: active ? theme.brandTint : 'rgba(255,255,255,0.05)',
                    borderColor: active ? 'rgba(255,255,255,0.85)' : theme.glassBorder,
                    borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                  },
                ]}>
                {/* The logos are full-colour brand marks on a dark sheet, so
                    they sit on their own white chip rather than being tinted. */}
                <View style={styles.logoPlate}>
                  <Image source={option.logo} style={styles.logo} contentFit="contain" />
                </View>
                <Text variant="caption" numberOfLines={1} style={styles.methodName}>
                  {option.name}
                </Text>
              </Touchable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        {knownAs ? (
          <View style={[styles.identity, { borderColor: theme.glassBorder }]}>
            <Ionicons name="person-circle-outline" size={18} color={theme.textSecondary} />
            <Text variant="small" color="textSecondary" numberOfLines={1} style={styles.identityText}>
              Paying as {knownAs}
            </Text>
          </View>
        ) : (
          <Field
            label="Full name"
            value={details.fullName}
            onChangeText={(fullName) => onChangeDetails({ ...details, fullName })}
            placeholder="Abebe Kebede"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            error={showErrors ? nameError : null}
          />
        )}
        <Field
          label={knownAs ? 'Phone to pay from' : 'Phone number'}
          value={details.phone}
          onChangeText={(phone) => onChangeDetails({ ...details, phone })}
          placeholder={isCard ? '555 123 4567' : '912 345 678'}
          prefix={isCard ? '+' : '+251'}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          error={showErrors ? phoneError : null}
          hint={isCard ? undefined : 'The payment prompt goes to this number.'}
        />
        {knownAs ? null : (
          <Field
            label="Email (optional)"
            value={details.email}
            onChangeText={(email) => onChangeDetails({ ...details, email })}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            hint="We'll send a copy of your ticket here."
          />
        )}
      </View>

      {error ? (
        <Text variant="small" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button
        label={submitting ? 'Starting payment' : `Pay ${formatPrice(total, currency)}`}
        loading={submitting}
        disabled={!selectedMethod}
        size="lg"
        onPress={onPay}
      />

      <Text variant="caption" color="textMuted" style={styles.legal}>
        {isCard
          ? 'You will be taken to a secure checkout to enter your card.'
          : 'Approve the prompt on your phone to finish paying.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  summaryText: { flexShrink: 1 },
  section: { gap: Spacing.sm },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  identityText: { flexShrink: 1 },
  methodRow: { flexDirection: 'row', gap: Spacing.sm },
  method: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    borderRadius: Radius.md,
  },
  logoPlate: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  logo: { width: '100%', height: '100%' },
  methodName: { textAlign: 'center' },
  error: { textAlign: 'center' },
  legal: { textAlign: 'center' },
});

export const PaymentStep = memo(PaymentStepImpl);
