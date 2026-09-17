import { deleteRaw, getData, postData, postRaw, putData, putRaw } from '@/api/client';
import type {
  AuthPayload,
  LoginResult,
  NotificationPreferences,
  PasswordResetChannel,
  PasswordResetRequestResult,
  User,
} from '@/types/api';

/**
 * Creates a real account with a real password — every account now needs one;
 * there is no more password-is-the-phone-number backdoor. Email stays
 * optional: the backend mints a placeholder address when it's left out, the
 * same way guest checkout used to, so the account is still fully reachable
 * by phone-number login.
 *
 * The account exists as soon as this resolves, but it has no token yet — the
 * backend sends a code to the phone number instead, and the caller must
 * complete sign-up with `verifyRegisterOtp` before it can sign in. Same
 * `requiresOtp`-shaped body as `login`, hence the shared `postRaw` handling.
 */
export function register(input: {
  fullName: string;
  phoneNumber: string;
  email?: string;
  password: string;
}): Promise<LoginResult> {
  const parts = input.fullName.trim().split(/\s+/).filter(Boolean);
  return postRaw<{
    requiresOtp?: boolean;
    data: Partial<AuthPayload> & {
      email?: string;
      channel?: PasswordResetChannel;
      maskedDestination?: string;
    };
  }>('/auth/register', {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' ') || undefined,
    phoneNumber: input.phoneNumber,
    email: input.email,
    password: input.password,
  }).then(({ requiresOtp, data }) =>
    requiresOtp
      ? {
          requiresOtp: true,
          email: data.email!,
          channel: data.channel ?? 'sms',
          maskedDestination: data.maskedDestination!,
        }
      : { requiresOtp: false, user: data.user!, token: data.token! },
  );
}

/**
 * Password sign-in — `identifier` accepts a phone number or an email.
 * Response is `{status, data}` on a normal login but `{status, requiresOtp,
 * data:{email,channel,maskedDestination}}` when the account needs a second
 * factor — `postData` alone would silently drop the sibling `requiresOtp`
 * flag, so this reads the raw body instead.
 */
export function login(identifier: string, password: string): Promise<LoginResult> {
  return postRaw<{
    requiresOtp?: boolean;
    data: Partial<AuthPayload> & {
      email?: string;
      channel?: PasswordResetChannel;
      maskedDestination?: string;
    };
  }>('/auth/login', { identifier, password }).then(({ requiresOtp, data }) =>
    requiresOtp
      ? {
          requiresOtp: true,
          email: data.email!,
          channel: data.channel ?? 'sms',
          maskedDestination: data.maskedDestination!,
        }
      : { requiresOtp: false, user: data.user!, token: data.token! },
  );
}

/** Completes the second-factor step `login` started. */
export function verifyLoginOtp(email: string, code: string): Promise<AuthPayload> {
  return postData<AuthPayload>('/auth/organizer/verify-otp', { email, code });
}

/** Completes the phone-verification step `register` started, issuing the account's first token. */
export function verifyRegisterOtp(email: string, code: string): Promise<AuthPayload> {
  return postData<AuthPayload>('/auth/verify-register-otp', { email, code });
}

/** Re-sends the registration code — the "Resend code" link on the post-signup verify step. */
export function resendRegisterOtp(email: string): Promise<PasswordResetRequestResult> {
  return postRaw<PasswordResetRequestResult>('/auth/resend-register-otp', { email });
}

/**
 * Sends a phone-verification code to the signed-in account's own number —
 * for pre-existing accounts (created before phone verification shipped)
 * that want to turn on login codes but have never verified.
 */
export function sendPhoneVerifyOtp(): Promise<PasswordResetRequestResult> {
  return postRaw<PasswordResetRequestResult>('/auth/send-phone-verify-otp');
}

/** Completes `sendPhoneVerifyOtp`, marking the account's phone verified. */
export function verifyPhoneOtp(code: string): Promise<User> {
  return postData<User>('/auth/verify-phone-otp', { code });
}

/** Turns login codes on or off. The backend rejects `enabled: true` unless the phone is already verified. */
export function updateOtpPreference(enabled: boolean): Promise<{ otpEnabled: boolean }> {
  return putData<{ otpEnabled: boolean }>('/auth/otp-preference', { enabled });
}

/** Sends a 6-digit reset code to the email or phone on file. */
export function forgotPassword(
  identifier: string,
  channel: PasswordResetChannel = 'sms',
): Promise<PasswordResetRequestResult> {
  return postRaw<PasswordResetRequestResult>('/auth/forgot-password', { identifier, channel });
}

/**
 * Checks a reset code without consuming it, so a mistyped code costs the user
 * a retry rather than having to re-enter their new password too.
 */
export function verifyResetCode(identifier: string, code: string): Promise<void> {
  return postRaw<{ message: string }>('/auth/verify-reset-code', { identifier, code }).then(
    () => undefined,
  );
}

/** Completes a reset and signs the account in, mirroring `login`'s success shape. */
export function resetPassword(
  identifier: string,
  code: string,
  newPassword: string,
): Promise<AuthPayload> {
  return postData<AuthPayload>('/auth/reset-password', { identifier, code, newPassword });
}

/** Revalidates a rehydrated token and refreshes the cached profile. */
export function fetchMe(): Promise<User> {
  return getData<User>('/auth/me');
}

/**
 * Sets or changes the account's handle. Lowercased and uniqueness-checked
 * server-side; this is what lets other people find the account by exact
 * search instead of a name/phone directory listing.
 */
export function updateUsername(username: string): Promise<User> {
  return putData<User>('/auth/update-username', { username });
}

/** Adds or changes the account's email — used by the post-signup "add your email" nudge. */
export function updateEmail(email: string): Promise<User> {
  return putData<User>('/auth/update-profile', { email });
}

/** Full-name edit from the account menu. Phone number isn't editable here — it's the verified login identifier. */
export function updateProfile(input: { firstName: string; lastName?: string }): Promise<User> {
  return putData<User>('/auth/update-profile', input);
}

/** Requires the current password — a wrong one comes back as a 401. Response body carries no `data`, hence `putRaw`. */
export function updatePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  return putRaw<{ message: string }>('/auth/update-password', input).then(() => undefined);
}

/** Irreversible. Requires the current password; a wrong one comes back as a 401. */
export function deleteAccount(currentPassword: string): Promise<void> {
  return deleteRaw<{ message: string }>('/auth/delete-account', { data: { currentPassword } }).then(
    () => undefined,
  );
}

export function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  return getData<NotificationPreferences>('/auth/notification-preferences');
}

export function updateNotificationPreferences(
  partial: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return putData<NotificationPreferences>('/auth/notification-preferences', partial);
}

/** Registers this device's Expo push token — idempotent, safe to call on every launch. */
export function registerPushToken(token: string): Promise<void> {
  return postRaw<{ status: string }>('/auth/push-token', { token }).then(() => undefined);
}

/** Best-effort on sign-out — this device shouldn't keep getting this account's pushes once signed out. */
export function unregisterPushToken(token: string): Promise<void> {
  return deleteRaw<{ status: string }>('/auth/push-token', { data: { token } }).then(() => undefined);
}
