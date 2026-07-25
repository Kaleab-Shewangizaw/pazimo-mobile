import { type Href, useRouter } from 'expo-router';

/**
 * `router.back()` throws "The action 'GO_BACK' was not handled by any
 * navigator" whenever there's no history to pop — reachable on any screen
 * that can be entered directly (a deep link, a fresh reload while on that
 * route, or a notification tap). Falls back to the given route, defaulting
 * to Home, instead of leaving the back button dead.
 */
export function useGoBack(fallback: Href = '/') {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  };
}
