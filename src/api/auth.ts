import { getData, postData, putData } from '@/api/client';
import type { AuthPayload, User } from '@/types/api';

/**
 * The customer-facing door. One call covers both sign-in and sign-up: it looks
 * the phone number up and either returns that customer's session or creates the
 * account, so the app never has to ask "do you already have an account?".
 *
 * The password *is* the phone number — that is how the backend creates guest
 * accounts during checkout, and why a buyer who paid as a guest can sign in
 * later with nothing but the number they paid with.
 *
 * Only `customer` accounts are matched; an organizer or admin using the same
 * number gets a separate customer account rather than their staff session.
 */
export function unifiedAuth(input: {
  fullName: string;
  phoneNumber: string;
  email?: string;
}): Promise<AuthPayload> {
  return postData<AuthPayload>('/auth/unified-auth', input);
}

/** Email + password sign-in, for accounts that set a real password on the web. */
export function login(email: string, password: string): Promise<AuthPayload> {
  return postData<AuthPayload>('/auth/login', { email, password });
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
