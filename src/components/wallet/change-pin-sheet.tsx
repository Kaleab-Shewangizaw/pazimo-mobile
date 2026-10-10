import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { changeWalletPin } from '@/api/wallet';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { OtpInput } from '@/components/ui/otp-input';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { weakPinReason } from '@/lib/wallet';

/** Current PIN, new PIN, new PIN again. A forgotten PIN goes through the SMS reset instead. */
type Step = 'current' | 'new' | 'confirm';

const PROMPT: Record<Step, string> = {
  current: 'Enter your current wallet PIN.',
  new: 'Choose a new 6-digit PIN.',
  confirm: 'Enter the new PIN again.',
};

export function ChangePinSheet({
  visible,
  onClose,
  onForgot,
}: {
  visible: boolean;
  onClose: () => void;
  onForgot: () => void;
}) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('current');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setStep('current');
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
    setDone(false);
    setBusy(false);
  }, []);

  const close = useCallback(() => {
    Keyboard.dismiss();
    onClose();
    setTimeout(reset, 260);
  }, [onClose, reset]);

  const value = step === 'current' ? current : step === 'new' ? next : confirm;

  const onChange = async (text: string) => {
    setError(null);
    if (step === 'current') {
      setCurrent(text);
      if (text.length === 6) setStep('new');
      return;
    }
    if (step === 'new') {
      setNext(text);
      if (text.length === 6) {
        const weak = weakPinReason(text) || (text === current ? 'Choose a PIN different from your current one.' : null);
        if (weak) {
          setError(weak);
          setNext('');
        } else {
          setStep('confirm');
        }
      }
      return;
    }
    setConfirm(text);
    if (text.length < 6) return;
    if (text !== next) {
      setError('The PINs don’t match. Choose your new PIN again.');
      setNext('');
      setConfirm('');
      setStep('new');
      return;
    }
    setBusy(true);
    try {
      await changeWalletPin(current, next);
      setDone(true);
    } catch (err) {
      const apiError = err instanceof ApiError ? err : null;
      setError(apiError?.message ?? 'We couldn’t change your PIN. Try again.');
      // A wrong current PIN is the usual reason; start over from it.
      setCurrent('');
      setNext('');
      setConfirm('');
      setStep('current');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.header}>
        <Text variant="title" style={styles.flex}>
          Change PIN
        </Text>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={close}
          pressedScale={0.9}
          style={[styles.headerButton, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons name="close" size={18} color={theme.text} />
        </Touchable>
      </View>

      {done ? (
        <View style={styles.doneBlock}>
          <Ionicons name="checkmark-circle" size={56} color={theme.success} />
          <Text variant="heading">PIN changed</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <Text variant="body" color="textSecondary">
            {PROMPT[step]}
          </Text>
          <OtpInput
            key={step}
            value={value}
            onChangeText={onChange}
            secure
            autoFocus
            refocusOn={error}
            accessibilityLabel={PROMPT[step]}
          />
          {error ? (
            <Text variant="small" color="danger" style={styles.center} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          {busy ? (
            <Text variant="small" color="textSecondary" style={styles.center}>
              Saving…
            </Text>
          ) : null}
          {step === 'current' ? (
            <Touchable
              accessibilityRole="button"
              onPress={() => {
                close();
                setTimeout(onForgot, 300);
              }}
              style={styles.forgot}>
              <Text variant="small" color="textSecondary" style={styles.underline}>
                Forgot your PIN?
              </Text>
            </Touchable>
          ) : null}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  body: { gap: Spacing.lg },
  center: { textAlign: 'center' },
  doneBlock: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  forgot: { alignSelf: 'center', padding: Spacing.sm },
  underline: { textDecorationLine: 'underline' },
});
