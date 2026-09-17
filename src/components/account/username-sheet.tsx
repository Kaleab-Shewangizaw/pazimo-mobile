import { useCallback, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { updateUsername } from '@/api/auth';
import { ApiError } from '@/api/client';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/use-auth-store';

/** Same rule the backend enforces (`^[a-z0-9_]{4,20}$`) — checked client-side only to give instant feedback before the round trip. */
const USERNAME_PATTERN = /^[a-z0-9_]{4,20}$/;

/**
 * How other people find this account to send it a ticket. Search is
 * exact-match only (see `recipient-step.tsx`), so a handle is what makes
 * this account findable at all — there is no directory to stumble into it
 * from.
 */
export function UsernameSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [value, setValue] = useState(() => user?.username ?? '');
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatError = USERNAME_PATTERN.test(value)
    ? null
    : '4-20 characters: lowercase letters, digits, and underscores only.';

  const onChange = useCallback((text: string) => {
    // Matches the format the backend accepts and lowercases anyway, so the
    // field never shows the user a character it's about to strip.
    setValue(text.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20));
  }, []);

  const submit = useCallback(async () => {
    setShowError(true);
    if (formatError) return;

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateUsername(value);
      await setUser(updated);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('That username is taken — try another.');
      } else {
        setError(
          err instanceof ApiError ? err.message : 'Could not update your username. Try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [formatError, onClose, setUser, value]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.intro}>
          <Text variant="title">{user?.username ? 'Change username' : 'Pick a username'}</Text>
          <Text variant="small" color="textSecondary">
            Other people search for this exact handle to send you a ticket.
          </Text>
        </View>

        <Field
          label="Username"
          value={value}
          onChangeText={onChange}
          placeholder="kaleab_dev"
          prefix="@"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          error={showError ? formatError : null}
        />

        {error ? (
          <Text variant="small" color="danger" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button label="Save" size="lg" loading={submitting} onPress={submit} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  intro: { gap: Spacing.xs },
  error: { textAlign: 'center' },
});
