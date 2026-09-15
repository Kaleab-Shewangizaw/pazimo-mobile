import { useCallback, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { updateEmail } from '@/api/auth';
import { ApiError } from '@/api/client';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/use-auth-store';

/**
 * The nudge shown right after signup/login when the account has no real
 * email yet — either it was skipped at signup, or it's still the
 * `customerpazimo…@gmail.com` placeholder the backend mints. Skippable: this
 * app never gates browsing or account access on it, only offers the benefit
 * (ticket and order emails) and gets out of the way.
 */
export function AddEmailSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatError = /^\S+@\S+\.\S+$/.test(email.trim()) ? null : 'Enter a valid email.';

  const submit = useCallback(async () => {
    setShowError(true);
    if (formatError) return;

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateEmail(email.trim());
      await setUser(updated);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('That email is already taken — try another.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not save your email. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [email, formatError, onClose, setUser]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.intro}>
          <Text variant="title">Add your email</Text>
          <Text variant="small" color="textSecondary">
            So we can send your tickets and order updates.
          </Text>
        </View>

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={showError ? formatError : null}
        />

        {error ? (
          <Text variant="small" color="danger" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button label="Add email" size="lg" loading={submitting} onPress={submit} />
        <Touchable accessibilityRole="button" style={styles.skip} onPress={onClose}>
          <Text variant="small" color="textSecondary">
            Not now
          </Text>
        </Touchable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  intro: { gap: Spacing.xs },
  error: { textAlign: 'center' },
  skip: { alignSelf: 'center' },
});
