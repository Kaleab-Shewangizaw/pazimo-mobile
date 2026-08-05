import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { unifiedAuth } from '@/api/auth';
import { ApiError } from '@/api/client';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { localEthiopianDigits, nationalEthiopianNumber } from '@/lib/payment-methods';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';

/**
 * Sign in and sign up are the same form, because on the backend they are the
 * same call: `unified-auth` looks the phone number up and either returns that
 * customer's session or creates one. Asking "do you have an account?" would be
 * asking the user a question the server can answer better.
 *
 * There is no password field for the same reason — the account's password *is*
 * the phone number, which is how guest checkout can create a usable account
 * without ever prompting for one.
 */
export function SignInSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const signIn = useAuthStore((s) => s.signIn);
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameError = fullName.trim().length >= 2 ? null : 'Enter your name.';
  const phoneDigits = localEthiopianDigits(phone);
  const phoneError =
    phoneDigits.length === 9 && /^[79]/.test(phoneDigits)
      ? null
      : 'Enter a 9-digit Ethiopian number, e.g. 912 345 678.';

  const submit = useCallback(async () => {
    setShowErrors(true);
    if (nameError || phoneError) return;

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    try {
      const payload = await unifiedAuth({
        fullName: fullName.trim(),
        // Stored the way checkout stores it, so the same person is not created
        // twice under two spellings of one number.
        phoneNumber: nationalEthiopianNumber(phone),
        email: email.trim() || undefined,
      });
      await signIn(payload);
      // The account's own ticket list is now reachable; drop the guest-only view.
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not sign you in. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [email, fullName, nameError, onClose, phone, phoneError, queryClient, signIn]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.intro}>
          <Text variant="title">Sign in</Text>
          <Text variant="small" color="textSecondary">
            Use the phone number you bought tickets with and they will all be here.
          </Text>
        </View>

        <Field
          label="Full name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Abebe Kebede"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          error={showErrors ? nameError : null}
        />
        <Field
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          placeholder="912 345 678"
          prefix="+251"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          error={showErrors ? phoneError : null}
        />
        <Field
          label="Email (optional)"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />

        {error ? (
          <Text variant="small" color="danger" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button label="Continue" size="lg" loading={submitting} onPress={submit} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  intro: { gap: Spacing.xs },
  error: { textAlign: 'center' },
});
