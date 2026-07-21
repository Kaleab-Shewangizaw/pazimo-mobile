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
   * Deep link back into the app after an external payment gateway finishes.
   * Matches `expo.scheme` in app.json.
   */
  scheme: 'pazimomobile',
} as const;
