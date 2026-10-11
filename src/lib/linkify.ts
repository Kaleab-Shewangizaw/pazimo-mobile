import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { Platform } from 'react-native';

import { parseInviteLink, routeForInvite } from '@/lib/invite-link';

/**
 * Splits chat text into plain runs and tappable links — URLs (with or
 * without a scheme, so `pazimo.com/events/x` and `www.site.com` both count),
 * email addresses, and phone numbers — the same things Telegram/WhatsApp
 * underline. Each link segment carries the `href` it should open, already
 * normalized (`https://` added, `mailto:`/`tel:` prefixed).
 */

export type LinkSegment =
  | { type: 'text'; text: string }
  | { type: 'url' | 'email' | 'phone'; text: string; href: string };

// Plain numbered groups, not named ones — Hermes doesn't reliably fill in
// `match.groups`, and without it every link fell through to the bare-domain
// branch (`https://https://…`). Group 1 scheme://, 2 email, 3 www., 4 bare
// domain, 5 phone.
//
// Order matters: at any one position the regex engine tries these left to
// right, so a full email wins over the bare domain inside it, and an
// explicit scheme wins over the bare-domain fallback.
const LINK_PATTERN = new RegExp(
  [
    // Any scheme://… — http(s), but also this app's own `pazimomobile://`
    // and Expo Go's `exp://` deep links.
    String.raw`([a-z][a-z0-9+.-]*:\/\/[^\s<>"']+)`,
    String.raw`([a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})`,
    String.raw`(www\.[^\s<>"']+)`,
    // Bare domains need a known TLD, otherwise "e.g" or "file.txt" would light up.
    String.raw`(\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|app|et|co|dev|me|info|biz|tv|gov|edu)\b(?:\/[^\s<>"']*)?)`,
    // International (+251 91 234 5678) or a local 09/07 mobile number —
    // deliberately strict so prices and order numbers don't become links.
    String.raw`(\+\d{1,3}(?:[\s-]?\d){7,12}|\b0[79]\d{8}\b)`,
  ].join('|'),
  'gi',
);

/** Sentence punctuation that's almost never part of the link itself. */
function trimTrailing(raw: string): string {
  let out = raw.replace(/[.,!?;:'"]+$/, '');
  // Keep a closing paren only when the link opened one — `(see x.com/a)`
  // versus `en.wikipedia.org/wiki/Foo_(bar)`.
  while (out.endsWith(')') && (out.match(/\(/g)?.length ?? 0) < (out.match(/\)/g)?.length ?? 0)) {
    out = out.slice(0, -1).replace(/[.,!?;:'"]+$/, '');
  }
  return out;
}

export function linkify(text: string): LinkSegment[] {
  const segments: LinkSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(LINK_PATTERN)) {
    const [, , email, , , phone] = match;
    const start = match.index ?? 0;
    let raw = match[0];
    let segment: LinkSegment;

    if (email) {
      segment = { type: 'email', text: raw, href: `mailto:${raw}` };
    } else if (phone) {
      segment = { type: 'phone', text: raw, href: `tel:${raw.replace(/[\s-]/g, '')}` };
    } else {
      raw = trimTrailing(raw);
      if (!raw) continue;
      // Checked on the text itself rather than trusting which group matched,
      // so a link that already has a scheme can never get a second one.
      const href = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
      segment = { type: 'url', text: raw, href };
    }

    if (start > cursor) segments.push({ type: 'text', text: text.slice(cursor, start) });
    segments.push(segment);
    cursor = start + raw.length;
  }

  if (cursor < text.length) segments.push({ type: 'text', text: text.slice(cursor) });
  return segments;
}

export function hasLinks(segments: LinkSegment[]): boolean {
  return segments.some((s) => s.type !== 'text');
}

/**
 * Opens a link from chat the way a messaging app would: Pazimo
 * movies/events/venues (deep link or pazimo.com URL) open in-app, other
 * web links in the in-app browser sheet, and mailto:/tel:/other schemes
 * hand off to the OS.
 */
export async function openLink(href: string): Promise<void> {
  const invite = parseInviteLink(href);
  if (invite) {
    router.push(routeForInvite(invite));
    return;
  }
  try {
    if (/^https?:\/\//i.test(href) && Platform.OS !== 'web') {
      await openBrowserAsync(href, { presentationStyle: WebBrowserPresentationStyle.AUTOMATIC });
    } else {
      await Linking.openURL(href);
    }
  } catch {
    // No handler for this scheme (e.g. tel: on a simulator) — nothing useful to show.
  }
}
