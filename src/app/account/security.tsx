import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { Button } from '@/components/ui/button';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { ListCard } from '@/components/ui/list-row';
import { OtpInput } from '@/components/ui/otp-input';
import { Touchable } from '@/components/ui/pressable';
import { SectionHeader } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useSendPhoneVerifyOtp,
  useUpdateOtpPreference,
  useVerifyPhoneOtp,
} from '@/queries/account';
import { useAuthStore } from '@/stores/use-auth-store';

/**
 * Phone verification and the login-code (2FA) toggle it unlocks. Every
 * account created after this shipped is already verified from sign-up —
 * this screen mostly exists for accounts that predate it.
 */
export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);

  const { submit: sendCode, submitting: sending, error: sendError } = useSendPhoneVerifyOtp();
  const { submit: verifyCode, submitting: verifying, error: verifyError } = useVerifyPhoneOtp();
  const {
    submit: setOtpEnabled,
    submitting: togglingOtp,
    error: toggleError,
  } = useUpdateOtpPreference();

  const [maskedDestination, setMaskedDestination] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [showCodeError, setShowCodeError] = useState(false);
  const codeError = code.length === 6 ? null : 'Enter the 6-digit code.';

  const onSendCode = useCallback(async () => {
    const masked = await sendCode();
    if (masked) {
      setMaskedDestination(masked);
      setCode('');
      setShowCodeError(false);
    }
  }, [sendCode]);

  const onVerifyCode = useCallback(async () => {
    setShowCodeError(true);
    if (codeError) return;
    Keyboard.dismiss();
    const ok = await verifyCode(code);
    if (ok) {
      setMaskedDestination(null);
      setCode('');
    }
  }, [code, codeError, verifyCode]);

  if (!user) return null;

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Security" left={<HeaderBackButton />} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl,
            paddingBottom: tabBarClearance(insets.bottom),
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View>
          <SectionHeader title="Phone verification" />
          <ListCard>
            {user.isPhoneVerified ? (
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="body">Phone number verified</Text>
                  <Text variant="caption" color="textSecondary">
                    {user.phoneNumber}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color={theme.brand} />
              </View>
            ) : maskedDestination ? (
              <View style={styles.verifyBlock}>
                <Text variant="small" color="textSecondary">
                  We sent a 6-digit code to {maskedDestination}.
                </Text>
                <OtpInput value={code} onChangeText={setCode} autoFocus />
                {showCodeError && codeError ? (
                  <Text variant="caption" color="danger">
                    {codeError}
                  </Text>
                ) : null}
                {verifyError ? (
                  <Text variant="small" color="danger">
                    {verifyError}
                  </Text>
                ) : null}
                <Button label="Verify" loading={verifying} onPress={onVerifyCode} />
                <Touchable
                  accessibilityRole="button"
                  style={styles.linkCenter}
                  onPress={onSendCode}>
                  <Text variant="small" color="brand">
                    Resend code
                  </Text>
                </Touchable>
              </View>
            ) : (
              <View style={styles.verifyBlock}>
                <View style={styles.rowText}>
                  <Text variant="body">Phone number not verified</Text>
                  <Text variant="caption" color="textSecondary">
                    Verify {user.phoneNumber} to turn on login codes.
                  </Text>
                </View>
                {sendError ? (
                  <Text variant="small" color="danger">
                    {sendError}
                  </Text>
                ) : null}
                <Button label="Send code" loading={sending} onPress={onSendCode} />
              </View>
            )}
          </ListCard>
        </View>

        <View>
          <SectionHeader title="Login" />
          <ListCard>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text variant="body">Login verification codes</Text>
                <Text variant="caption" color="textSecondary">
                  {user.isPhoneVerified
                    ? 'Ask for a code sent to your phone every time you log in.'
                    : 'Verify your phone number above to turn this on.'}
                </Text>
              </View>
              <Switch
                value={Boolean(user.otpEnabled)}
                disabled={!user.isPhoneVerified || togglingOtp}
                onValueChange={(value) => {
                  setOtpEnabled(value);
                }}
                trackColor={{ false: theme.glassBorder, true: theme.brand }}
                thumbColor="#FFFFFF"
              />
            </View>
            {toggleError ? (
              <Text variant="small" color="danger" style={styles.toggleError}>
                {toggleError}
              </Text>
            ) : null}
          </ListCard>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  rowText: { flex: 1, gap: 2 },
  verifyBlock: { paddingVertical: Spacing.lg, gap: Spacing.md },
  linkCenter: { alignSelf: 'center' },
  toggleError: { paddingBottom: Spacing.md },
});
