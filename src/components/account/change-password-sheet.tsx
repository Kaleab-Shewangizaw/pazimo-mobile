import { useCallback, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useUpdatePassword } from '@/queries/account';

/** A wrong current password reaches this as a 401 — surfaced as a field-level error, not a toast, since it's the one field to fix. */
export function ChangePasswordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { submit, submitting } = useUpdatePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showError, setShowError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatError = newPassword.length >= 6 ? null : 'At least 6 characters.';

  const reset = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setShowError(false);
    setError(null);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const onSubmit = useCallback(async () => {
    setShowError(true);
    if (formatError || !currentPassword) return;

    Keyboard.dismiss();
    setError(null);
    const ok = await submit({ currentPassword, newPassword });
    if (ok) {
      close();
    } else {
      setError('Your current password may be incorrect.');
    }
  }, [close, currentPassword, formatError, newPassword, submit]);

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.container}>
        <View style={styles.intro}>
          <Text variant="title">Change password</Text>
          <Text variant="small" color="textSecondary">
            You&apos;ll stay signed in on this device.
          </Text>
        </View>

        <Field
          label="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
        />

        <Field
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          error={showError ? formatError : null}
        />

        {error ? (
          <Text variant="small" color="danger" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button label="Save" size="lg" loading={submitting} onPress={onSubmit} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  intro: { gap: Spacing.xs },
  error: { textAlign: 'center' },
});
