import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Keyboard, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { revokeOtherSessions, revokeSession } from '@/api/auth';
import { ApiError } from '@/api/client';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DeviceRow, deviceName } from '@/components/ui/device-row';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { ListCard, ListRow } from '@/components/ui/list-row';
import { OtpInput } from '@/components/ui/otp-input';
import { Touchable } from '@/components/ui/pressable';
import { SectionHeader } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { relativeTimeLabel } from '@/lib/date';
import {
  useAccountSessions,
  useSendPhoneVerifyOtp,
  useUpdateOtpPreference,
  useVerifyPhoneOtp,
} from '@/queries/account';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';
import type { AccountSession } from '@/types/api';

/** "iOS 18.2 · Pazimo 1.4.0 · Active 5 min ago" — what tells two phones apart at a glance. */
function sessionSubtitle(session: AccountSession): string {
  const parts: string[] = [];
  if (session.osVersion) parts.push(`${session.platform === 'ios' ? 'iOS' : session.platform === 'android' ? 'Android' : ''} ${session.osVersion}`.trim());
  if (session.appVersion) parts.push(`Pazimo ${session.appVersion}`);
  parts.push(session.current ? 'Online' : `Active ${relativeTimeLabel(session.lastSeenAt)}`);
  return parts.join(' · ');
}

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

  const queryClient = useQueryClient();
  const sessions = useAccountSessions();
  const current = sessions.data?.find((session) => session.current);
  const others = sessions.data?.filter((session) => !session.current) ?? [];
  const [ending, setEnding] = useState<AccountSession | 'all' | null>(null);
  const [endingBusy, setEndingBusy] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const confirmEnd = useCallback(async () => {
    if (!ending) return;
    setEndingBusy(true);
    setSessionError(null);
    try {
      if (ending === 'all') await revokeOtherSessions();
      else await revokeSession(ending.id);
    } catch (err) {
      setSessionError(err instanceof ApiError ? err.message : 'We couldn’t end that session. Try again.');
    } finally {
      await queryClient.invalidateQueries({ queryKey: queryKeys.account.sessions });
      setEndingBusy(false);
      setEnding(null);
    }
  }, [ending, queryClient]);

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

        <View>
          <SectionHeader title="Active sessions" />
          <ListCard>
            {sessions.isLoading ? (
              <ActivityIndicator color="#FFFFFF" style={styles.loading} />
            ) : current ? (
              <DeviceRow
                platform={current.platform}
                title={deviceName(current.platform, current.deviceModel)}
                subtitle={sessionSubtitle(current)}
                current
              />
            ) : (
              <Text variant="small" color="textSecondary" style={styles.loading}>
                {sessions.isError ? 'Couldn’t load your sessions. Go back and open this screen again.' : 'This device'}
              </Text>
            )}
            {others.length ? (
              <ListRow
                icon="hand-left-outline"
                label="Terminate all other sessions"
                danger
                onPress={() => setEnding('all')}
              />
            ) : null}
          </ListCard>
          <Text variant="caption" color={sessionError ? 'danger' : 'textMuted'} style={styles.footnote}>
            {sessionError ?? 'Signs you out on every device except this one.'}
          </Text>
        </View>

        {others.length ? (
          <View>
            <SectionHeader title="Other sessions" />
            <ListCard>
              {others.map((session) => (
                <DeviceRow
                  key={session.id}
                  platform={session.platform}
                  title={deviceName(session.platform, session.deviceModel)}
                  subtitle={sessionSubtitle(session)}
                  onPress={() => setEnding(session)}
                />
              ))}
            </ListCard>
            <Text variant="caption" color="textMuted" style={styles.footnote}>
              Tap a session to sign that device out.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={Boolean(ending)}
        title={ending === 'all' ? 'Terminate all other sessions?' : 'Terminate this session?'}
        message={
          ending === 'all'
            ? 'Every other device signed in to your account will be signed out.'
            : ending
              ? `${deviceName(ending.platform, ending.deviceModel)} will be signed out of your account.`
              : undefined
        }
        confirmLabel={endingBusy ? 'Terminating…' : 'Terminate'}
        destructive
        onConfirm={confirmEnd}
        onCancel={() => setEnding(null)}
      />
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
  loading: { paddingVertical: Spacing.lg },
  footnote: { marginTop: Spacing.sm, paddingHorizontal: Spacing.xs },
});
