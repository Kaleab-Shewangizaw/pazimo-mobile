/**
 * Expo inlines `process.env.EXPO_PUBLIC_*` at build time, so these must be
 * referenced as full static property accesses — destructuring `process.env`
 * or building the key dynamically breaks the substitution.
 */

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. Copy the .env at the repo root and restart the dev server ' +
      '(env changes require a full restart, not a fast refresh).',
  );
}

export const Env = {
  /** Backend origin, no trailing slash and no `/api` suffix. */
  apiUrl: apiUrl.replace(/\/+$/, ''),
  /**
   * Public website origin for links shared outside the app. Separate from
   * `apiUrl` so pointing the API at a local backend doesn't leak localhost
   * links into shares.
   */
  webUrl: (process.env.EXPO_PUBLIC_WEB_URL || 'https://pazimo.com').replace(/\/+$/, ''),
  /**
   * Deep link back into the app after an external payment gateway finishes.
   * Matches `expo.scheme` in app.json.
   */
  scheme: 'pazimomobile',
  /**
   * Store listings handed out in SMS invitations (see `lib/app-invite.ts`).
   * Play's URL is derived from `android.package` in app.json, so it needs no
   * config; the App Store's carries a numeric id only known once the listing
   * exists, so iOS links are left out of invites until this is set.
   */
  appStoreUrl: process.env.EXPO_PUBLIC_APP_STORE_URL || null,
  playStoreUrl:
    process.env.EXPO_PUBLIC_PLAY_STORE_URL ||
    'https://play.google.com/store/apps/details?id=com.kal_x.pazimomobile',
} as const;
