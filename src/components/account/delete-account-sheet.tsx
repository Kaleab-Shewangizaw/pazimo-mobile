import { useCallback, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDeleteAccount } from '@/queries/account';

/**
 * Password entry, then a final yes/no — two deliberate steps for something
 * that can't be undone. The password is what actually authorizes the delete
 * server-side; the `ConfirmDialog` is a last chance to back out before it fires.
 */
export function DeleteAccountSheet({
  visible,
  onClose,
  onDeleted,
}: {
  visible: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const theme = useTheme();
  const { submit, submitting, error } = useDeleteAccount();

  const [password, setPassword] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);

  const close = useCallback(() => {
    setPassword('');
    setConfirmVisible(false);
    onClose();
  }, [onClose]);

  const confirmDelete = useCallback(async () => {
    setConfirmVisible(false);
    const ok = await submit(password);
    if (ok) {
      setPassword('');
      onDeleted();
    }
  }, [onDeleted, password, submit]);

  return (
    <>
      <BottomSheet visible={visible} onClose={close}>
        <View style={styles.container}>
          <View style={styles.intro}>
            <Text variant="title">Delete account</Text>
            <Text variant="small" color="textSecondary">
              This permanently removes your account. Your tickets stay valid, but you won&apos;t be
              able to sign back in.
            </Text>
          </View>

          <Field
            label="Current password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
          />

          {error ? (
            <Text variant="small" color="danger" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Button
            label="Delete my account"
            size="lg"
            loading={submitting}
            disabled={!password}
            style={{ backgroundColor: theme.danger }}
            textStyle={styles.destructiveText}
            onPress={() => {
              Keyboard.dismiss();
              setConfirmVisible(true);
            }}
          />
        </View>
      </BottomSheet>

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete your account?"
        message="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setConfirmVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  intro: { gap: Spacing.xs },
  error: { textAlign: 'center' },
  destructiveText: { color: '#FFFFFF' },
});
