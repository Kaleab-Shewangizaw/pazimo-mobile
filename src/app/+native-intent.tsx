import { parseInviteLink } from '@/lib/invite-link';

/**
 * Every link the OS hands the app — a tapped pazimo.com link from SMS,
 * Telegram, email, etc. (App Links / Universal Links, see `intentFilters` and
 * `associatedDomains` in app.json), or a `pazimomobile://` deep link — passes
 * through here before Expo Router matches it to a screen.
 *
 * pazimo.com's URLs don't line up one-to-one with this app's routes (the site
 * says `/events/:id`, the app `/event/:id`), so known pages are rewritten to
 * the matching screen, and any other pazimo.com page opens the home feed
 * rather than a "not found" screen. Everything else passes through untouched.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const invite = parseInviteLink(path);
    if (invite) {
      if (invite.kind === 'movie') {
        return `/movie/${invite.id}${invite.openShowtimes ? '?openShowtimes=1' : ''}`;
      }
      if (invite.kind === 'event') return `/event/${invite.id}`;
      return `/refill/venue/${invite.id}`;
    }
    if (/^https?:\/\/(www\.)?pazimo\.com(\/|$|\?|#)/i.test(path)) return '/';
    return path;
  } catch {
    // Throwing here can crash the app on launch — fall back to the link as given.
    return path;
  }
}
