import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import {
  forgotPassword,
  login,
  register,
  resetPassword,
  verifyLoginOtp,
  verifyResetCode,
} from '@/api/auth';
import { ApiError } from '@/api/client';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { OtpInput } from '@/components/ui/otp-input';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { localEthiopianDigits, nationalEthiopianNumber } from '@/lib/payment-methods';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';
import type { AuthPayload, PasswordResetChannel, User } from '@/types/api';

type Mode = 'signup' | 'password' | 'otp' | 'forgot-request' | 'forgot-verify' | 'forgot-reset';

/**
 * Every account now needs a real password — there is no more "the password
 * is your phone number" backdoor, so this single sheet covers the whole
 * journey: creating an account, logging into an existing one (by phone or
 * email), the organizer 2FA code `login` can demand, and the full
 * forgot-password flow. One sheet rather than several stacked modals,
 * because each step only knows how to get to the next one, and a second
 * modal on top of this one fights its own drag-to-dismiss.
 */
export function AuthSheet({
  visible,
  onClose,
  onAuthenticated,
}: {
  visible: boolean;
  onClose: () => void;
  /** Fires after any successful sign-up/login, once the sheet has already closed. */
  onAuthenticated?: (user: User) => void;
}) {
  const signIn = useAuthStore((s) => s.signIn);
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>('signup');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set only when signup fails on a duplicate email/phone — offers a shortcut into the login tab. */
  const [duplicateIdentifier, setDuplicateIdentifier] = useState<string | null>(null);

  // Carried between steps of a single journey.
  const [otpEmail, setOtpEmail] = useState('');
  const [maskedDestination, setMaskedDestination] = useState('');
  const [verifiedCode, setVerifiedCode] = useState('');

  // Each open starts a fresh journey, but a still-closing sheet keeps
  // rendering whatever step it was on so the fade-out doesn't jump-cut.
  useEffect(() => {
    if (!visible) return;
    // Resetting local state to match a prop transition (the sheet reopening)
    // is the sync-with-external-input case the lint rule doesn't distinguish
    // from a derivable value — there is no prior render this could replace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode('signup');
    setFullName('');
    setPhone('');
    setEmail('');
    setIdentifier('');
    setPassword('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowErrors(false);
    setError(null);
    setDuplicateIdentifier(null);
    setOtpEmail('');
    setMaskedDestination('');
    setVerifiedCode('');
  }, [visible]);

  const completeSignIn = useCallback(
    async (payload: AuthPayload) => {
      await signIn(payload);
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      onClose();
      onAuthenticated?.(payload.user);
    },
    [onAuthenticated, onClose, queryClient, signIn],
  );

  const goTo = useCallback((next: Mode) => {
    setShowErrors(false);
    setError(null);
    setDuplicateIdentifier(null);
    setMode(next);
  }, []);

  const nameError = fullName.trim().length >= 2 ? null : 'Enter your name.';
  const phoneDigits = localEthiopianDigits(phone);
  const phoneError =
    phoneDigits.length === 9 && /^[79]/.test(phoneDigits)
      ? null
      : 'Enter a 9-digit Ethiopian number, e.g. 912 345 678.';
  const passwordError =
    mode === 'signup'
      ? password.length >= 6
        ? null
        : 'Use at least 6 characters.'
      : password.length > 0
        ? null
        : 'Enter your password.';
  const codeError = code.length === 6 ? null : 'Enter the 6-digit code.';
  const identifierError =
    identifier.trim().length >= 3 ? null : 'Enter your phone number or email.';
  const newPasswordError = newPassword.length >= 6 ? null : 'Use at least 6 characters.';
  const confirmError = confirmPassword === newPassword ? null : "Passwords don't match.";

  const submitSignup = useCallback(async () => {
    setShowErrors(true);
    if (nameError || phoneError || passwordError) return;

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    setDuplicateIdentifier(null);
    try {
      const payload = await register({
        fullName: fullName.trim(),
        phoneNumber: nationalEthiopianNumber(phone),
        email: email.trim() || undefined,
        password,
      });
      await completeSignIn(payload);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'EMAIL_TAKEN' || err.code === 'PHONE_TAKEN')) {
        setError(err.message);
        setDuplicateIdentifier(
          err.code === 'EMAIL_TAKEN' ? email.trim() : nationalEthiopianNumber(phone),
        );
      } else {
        setError(
          err instanceof ApiError ? err.message : 'We could not create your account. Try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [completeSignIn, email, fullName, nameError, phone, phoneError, password, passwordError]);

  const submitPassword = useCallback(async () => {
    setShowErrors(true);
    if (identifierError || passwordError) return;

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    try {
      const result = await login(identifier.trim(), password);
      if (result.requiresOtp) {
        setOtpEmail(result.email);
        setMaskedDestination(result.maskedDestination);
        goTo('otp');
      } else {
        await completeSignIn(result);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not log you in. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [completeSignIn, identifier, identifierError, goTo, password, passwordError]);

  const submitLoginOtp = useCallback(async () => {
    setShowErrors(true);
    if (codeError) return;

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    try {
      const payload = await verifyLoginOtp(otpEmail, code);
      await completeSignIn(payload);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That code did not work. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [code, codeError, completeSignIn, otpEmail]);

  const requestResetCode = useCallback(async () => {
    setShowErrors(true);
    if (identifierError) return;

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    try {
      const trimmed = identifier.trim();
      const channel: PasswordResetChannel = trimmed.includes('@') ? 'email' : 'sms';
      const result = await forgotPassword(trimmed, channel);
      setMaskedDestination(result.maskedDestination);
      setCode('');
      goTo('forgot-verify');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send a code. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [goTo, identifier, identifierError]);

  const submitVerifyResetCode = useCallback(async () => {
    setShowErrors(true);
    if (codeError) return;

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    try {
      await verifyResetCode(identifier.trim(), code);
      setVerifiedCode(code);
      goTo('forgot-reset');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That code did not work. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [code, codeError, goTo, identifier]);

  const submitNewPassword = useCallback(async () => {
    setShowErrors(true);
    if (newPasswordError || confirmError) return;

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    try {
      const payload = await resetPassword(identifier.trim(), verifiedCode, newPassword);
      await completeSignIn(payload);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not reset your password. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [completeSignIn, confirmError, identifier, newPassword, newPasswordError, verifiedCode]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {mode === 'signup' || mode === 'password' ? (
          <AuthTabs mode={mode} onSelect={goTo} />
        ) : null}

        {mode === 'signup' ? (
          <>
            <View style={styles.intro}>
              <Text variant="title">Create account</Text>
              <Text variant="small" color="textSecondary">
                Set a password so this account is really yours.
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
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              error={showErrors ? passwordError : null}
            />

            {error ? (
              <Text variant="small" color="danger" style={styles.error}>
                {error}
              </Text>
            ) : null}

            {duplicateIdentifier ? (
              <Button
                label="Log in instead"
                variant="secondary"
                onPress={() => {
                  setIdentifier(duplicateIdentifier);
                  goTo('password');
                }}
              />
            ) : null}

            <Button
              label="Create account"
              size="lg"
              loading={submitting}
              onPress={submitSignup}
            />
          </>
        ) : null}

        {mode === 'password' ? (
          <>
            <View style={styles.intro}>
              <Text variant="title">Log in</Text>
              <Text variant="small" color="textSecondary">
                Sign in with your phone number or email and your password.
              </Text>
            </View>

            <Field
              label="Phone number or email"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="912 345 678 or you@example.com"
              autoCapitalize="none"
              autoComplete="username"
              error={showErrors ? identifierError : null}
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              error={showErrors ? passwordError : null}
            />

            {error ? (
              <Text variant="small" color="danger" style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Touchable
              accessibilityRole="button"
              style={styles.linkCenter}
              onPress={() => goTo('forgot-request')}>
              <Text variant="small" color="brand">
                Forgot password?
              </Text>
            </Touchable>

            <Button label="Log in" size="lg" loading={submitting} onPress={submitPassword} />
          </>
        ) : null}

        {mode === 'otp' ? (
          <>
            <View style={styles.intro}>
              <Text variant="title">Enter your code</Text>
              <Text variant="small" color="textSecondary">
                We sent a 6-digit code to {maskedDestination}.
              </Text>
            </View>

            <OtpInput value={code} onChangeText={setCode} autoFocus />
            {showErrors && codeError ? (
              <Text variant="caption" color="danger">
                {codeError}
              </Text>
            ) : null}

            {error ? (
              <Text variant="small" color="danger" style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Button label="Verify" size="lg" loading={submitting} onPress={submitLoginOtp} />
            <Touchable
              accessibilityRole="button"
              style={styles.linkCenter}
              onPress={() => goTo('password')}>
              <Text variant="small" color="textSecondary">
                Back to log in
              </Text>
            </Touchable>
          </>
        ) : null}

        {mode === 'forgot-request' ? (
          <>
            <View style={styles.intro}>
              <Text variant="title">Reset your password</Text>
              <Text variant="small" color="textSecondary">
                Enter the email or phone number on your account and we will send you a code.
              </Text>
            </View>

            <Field
              label="Email or phone number"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="you@example.com or 912 345 678"
              autoCapitalize="none"
              autoComplete="email"
              error={showErrors ? identifierError : null}
            />

            {error ? (
              <Text variant="small" color="danger" style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Button label="Send code" size="lg" loading={submitting} onPress={requestResetCode} />
            <Touchable
              accessibilityRole="button"
              style={styles.linkCenter}
              onPress={() => goTo('password')}>
              <Text variant="small" color="textSecondary">
                Back to log in
              </Text>
            </Touchable>
          </>
        ) : null}

        {mode === 'forgot-verify' ? (
          <>
            <View style={styles.intro}>
              <Text variant="title">Enter the code</Text>
              <Text variant="small" color="textSecondary">
                We sent a 6-digit code to {maskedDestination}.
              </Text>
            </View>

            <OtpInput value={code} onChangeText={setCode} autoFocus />
            {showErrors && codeError ? (
              <Text variant="caption" color="danger">
                {codeError}
              </Text>
            ) : null}

            {error ? (
              <Text variant="small" color="danger" style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Button
              label="Verify"
              size="lg"
              loading={submitting}
              onPress={submitVerifyResetCode}
            />
            <Touchable accessibilityRole="button" style={styles.linkCenter} onPress={requestResetCode}>
              <Text variant="small" color="brand">
                Resend code
              </Text>
            </Touchable>
          </>
        ) : null}

        {mode === 'forgot-reset' ? (
          <>
            <View style={styles.intro}>
              <Text variant="title">Choose a new password</Text>
              <Text variant="small" color="textSecondary">
                Use at least 6 characters.
              </Text>
            </View>

            <Field
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              error={showErrors ? newPasswordError : null}
            />
            <Field
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              error={showErrors ? confirmError : null}
            />

            {error ? (
              <Text variant="small" color="danger" style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Button
              label="Reset password"
              size="lg"
              loading={submitting}
              onPress={submitNewPassword}
            />
          </>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function AuthTabs({
  mode,
  onSelect,
}: {
  mode: 'signup' | 'password';
  onSelect: (mode: 'signup' | 'password') => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.tabs, { borderColor: theme.glassBorder }]}>
      {(
        [
          ['signup', 'Create account'],
          ['password', 'Log in'],
        ] as const
      ).map(([value, label]) => {
        const active = mode === value;
        return (
          <Touchable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.tab, active ? { backgroundColor: theme.brandTint } : null]}
            onPress={() => onSelect(value)}>
            <Text variant="small" color={active ? 'text' : 'textSecondary'}>
              {label}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  intro: { gap: Spacing.xs },
  error: { textAlign: 'center' },
  linkCenter: { alignSelf: 'center' },
  tabs: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
});
