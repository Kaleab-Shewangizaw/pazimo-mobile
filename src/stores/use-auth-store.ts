import { create } from 'zustand';

import { fetchMe, signOutSession, unregisterPushToken } from '@/api/auth';
import { setAuthToken, setSessionEndedHandler } from '@/api/client';
import { queryClient } from '@/lib/query-client';
import { getRegisteredPushToken, setRegisteredPushToken } from '@/lib/push-notifications';
import { StorageKeys, secureStorage } from '@/lib/storage';
import type { AuthPayload, User } from '@/types/api';

/**
 * Pazimo is guest-first: nothing here may gate browsing or checkout. The store
 * exists so that *after* a purchase the buyer is already signed in — the
 * initiate call auto-creates an account and hands back a session, and this is
 * where that session lands.
 *
 * The token is the source of truth for "signed in"; the user object is a cached
 * profile that `fetchMe` refreshes. Both live in SecureStore (Keychain/Keystore
 * on native) rather than the query cache, because they must survive a cold
 * start before the first request goes out.
 */

type AuthState = {
  user: User | null;
  token: string | null;
  /** False until the persisted session has been read, so nothing flashes signed-out. */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Resolves to the authoritative profile — see the `signIn` implementation for why that isn't just `payload.user`. */
  signIn: (payload: AuthPayload) => Promise<User>;
  /** Refreshes the cached profile in place without touching the session. */
  setUser: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
  /** Swaps in a new token for the same account (the server upgraded this session) without re-fetching the profile. */
  replaceToken: (token: string) => Promise<void>;
  /** Drops the session locally only — the server already ended it from another device. */
  clearSession: () => Promise<void>;
};

function parseUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    // A corrupt cache is not worth failing a launch over — the token still
    // works, and `fetchMe` will repopulate this.
    return null;
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  hydrated: false,

  hydrate: async () => {
    const [token, rawUser] = await Promise.all([
      secureStorage.get(StorageKeys.token),
      secureStorage.get(StorageKeys.user),
    ]);
    setAuthToken(token);
    set({ token, user: parseUser(rawUser), hydrated: true });
  },

  signIn: async ({ user, token }) => {
    setAuthToken(token);
    set({ user, token });
    // `/auth/login` and `/auth/register` don't reliably echo back every profile
    // field (username in particular can be missing even when the account has
    // one set), so this reconciles against `/auth/me` before anything — the
    // post-signin "add your email"/"pick a username" nudge included — trusts
    // the profile as complete.
    const resolved = await fetchMe().catch(() => user);
    set({ user: resolved });
    await Promise.all([
      secureStorage.set(StorageKeys.token, token),
      secureStorage.set(StorageKeys.user, JSON.stringify(resolved)),
    ]);
    return resolved;
  },

  setUser: async (user) => {
    set({ user });
    await secureStorage.set(StorageKeys.user, JSON.stringify(user));
  },

  signOut: async () => {
    // Must go out while the session token is still attached — the endpoint
    // is authenticated, and once the token's cleared below the request would
    // 401 and this device would keep receiving the old account's pushes.
    // Capped so a slow network never holds up signing out.
    const pushToken = getRegisteredPushToken();
    if (pushToken) {
      setRegisteredPushToken(null);
      await Promise.race([
        unregisterPushToken(pushToken).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    }
    // Ends this device's session server-side, so it leaves Active sessions on
    // the account's other devices. Same 3 s cap as above.
    await Promise.race([
      signOutSession().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    setAuthToken(null);
    set({ user: null, token: null });
    await Promise.all([
      secureStorage.remove(StorageKeys.token),
      secureStorage.remove(StorageKeys.user),
    ]);
  },

  replaceToken: async (token) => {
    setAuthToken(token);
    set({ token });
    await secureStorage.set(StorageKeys.token, token);
  },

  clearSession: async () => {
    setRegisteredPushToken(null);
    setAuthToken(null);
    set({ user: null, token: null });
    queryClient.clear();
    await Promise.all([
      secureStorage.remove(StorageKeys.token),
      secureStorage.remove(StorageKeys.user),
    ]);
  },
}));

// Terminated from another device: every later request would 401, so sign out here too.
setSessionEndedHandler(() => {
  useAuthStore.getState().clearSession();
});

/** Display name that tolerates the single-name accounts `unified-auth` creates. */
export function displayName(user: User | null): string {
  if (!user) return 'Guest';
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
}

/** A no-email account either skipped it at signup or still has the backend's placeholder. */
export function needsEmail(user: User): boolean {
  return !user.email || user.email.includes('customerpazimo');
}
