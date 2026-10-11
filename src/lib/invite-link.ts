import * as Linking from 'expo-linking';
import type { Href } from 'expo-router';

import { Env } from '@/lib/env';

/**
 * Inviting someone to a movie/event/venue rides inside a plain chat message
 * as a deep link — there's no backend "invite" concept, so this is not a new
 * message kind or endpoint. `share-row.tsx`'s `MessageBubble` and
 * `invite-message-card.tsx` detect this shape client-side and render a rich
 * card instead of raw link text; `shares.tsx` does the same for the Chats
 * list preview.
 *
 * The path mirrors the real route (`/movie/:id`, `/event/:id`,
 * `/refill/venue/:id`), so a genuine OS-level tap-through (the app already
 * installed, link opened from Telegram/etc.) lands on the same screen too —
 * Expo Router's own scheme handling resolves it without any extra linking
 * config. Links to the public site (`https://pazimo.com/events/:id`, what
 * "Copy link" hands out) are recognized too, so one pasted into a chat
 * renders the same card.
 */

export type InviteKind = 'movie' | 'event' | 'venue';

export type ParsedInvite = {
  kind: InviteKind;
  id: string;
  openShowtimes?: boolean;
};

const INVITE_ROUTE: Record<InviteKind, string> = {
  movie: 'movie',
  event: 'event',
  venue: 'refill/venue',
};

const INVITE_PREVIEW: Record<InviteKind, string> = {
  movie: '🎬 Shared a movie',
  event: '🎟️ Shared an event',
  venue: '📍 Shared a venue',
};

const URL_LIKE = /^[a-z][a-z0-9+.-]*:\/\//i;

// pazimo.com (and whatever `EXPO_PUBLIC_WEB_URL` points at) — links to the
// public site's pages render as the same rich cards as the app's own links.
const WEB_HOSTS = new Set(
  ['pazimo.com', Env.webUrl.replace(/^https?:\/\//i, '').split('/')[0]].map((h) =>
    h.toLowerCase().replace(/^www\./, ''),
  ),
);
const WEB_URL = /^https?:\/\/([^/?#]+)([^?#]*)(\?[^#]*)?/i;

// Any build of this app's own deep link: the store build's `pazimomobile://`,
// a dev client's `exp+pazimo-mobile://`, or Expo Go's `exp://host:port/--/`.
// Matched by shape, not against *this* device's scheme — the sender and the
// receiver can be running different builds, and a link written by one has
// to render as a card on the other.
const APP_URL = /^(pazimomobile|exp\+[a-z0-9-]*pazimo[a-z0-9-]*|exps?):\/\/([^?#]*)(\?[^#]*)?/i;

export function buildInviteLink(
  kind: InviteKind,
  id: string,
  opts?: { openShowtimes?: boolean },
): string {
  return Linking.createURL(`/${INVITE_ROUTE[kind]}/${id}`, {
    queryParams: opts?.openShowtimes ? { openShowtimes: '1' } : undefined,
  });
}

/**
 * Public web equivalent for sharing *outside* the app (copy link / OS share
 * sheet) — `buildInviteLink`'s `pazimomobile://` link only means anything on
 * a device that already has the app installed, so it's the wrong thing to
 * hand to Instagram/Telegram/clipboard.
 *
 * Only `event` has a confirmed public page on pazimo.com right now (verified
 * against the live site as `/events/:shortId` — note *plural* `events`,
 * unlike this app's own `/event/:id` route, and the raw `shortId`/`_id`, not
 * the `slug` field). `movie`/`venue` have no public page yet — the cinema
 * catalog page is keyed by cinema, not by an individual movie or refill
 * venue — so those return `null` and callers should fall back to
 * `buildInviteLink` until the web app grows one.
 */
export function buildPublicInviteLink(kind: InviteKind, id: string): string | null {
  if (kind !== 'event') return null;
  return `${Env.webUrl}/events/${id}`;
}

export function parseInviteLink(text: string): ParsedInvite | null {
  const trimmed = text.trim();
  if (!trimmed || !URL_LIKE.test(trimmed)) return null;

  const web = WEB_URL.exec(trimmed);
  if (web) {
    const host = web[1].toLowerCase().replace(/^www\./, '');
    if (!WEB_HOSTS.has(host)) return null;
    // Not `URLSearchParams` — React Native's polyfill doesn't implement `get`.
    const openShowtimes = /[?&]openShowtimes=1(?:&|$)/.test(web[3] ?? '');
    return matchSegments(web[2].split('/').filter(Boolean), openShowtimes);
  }

  const app = APP_URL.exec(trimmed);
  if (!app) return null;
  const isExpoGo = app[1].toLowerCase().startsWith('exp') && !app[1].includes('+');
  // Expo Go puts the route after `/--/`; the other schemes start it right
  // after `://` (`pazimomobile://event/x` — "event" lands where a host would).
  let path = app[2];
  if (isExpoGo) {
    const marker = path.indexOf('/--/');
    if (marker === -1) return null;
    path = path.slice(marker + 4);
  }
  return matchSegments(path.split('/').filter(Boolean), /[?&]openShowtimes=1(?:&|$)/.test(app[3] ?? ''));
}

function matchSegments(segments: string[], openShowtimes: boolean): ParsedInvite | null {
  if (segments[0] === 'refill' && segments[1] === 'venue' && segments[2]) {
    return { kind: 'venue', id: segments[2] };
  }
  if (segments[0] === 'movie' && segments[1]) {
    return { kind: 'movie', id: segments[1], openShowtimes };
  }
  // `/events/:id` is the public site's shape, `/event/:id` the app's.
  if ((segments[0] === 'event' || segments[0] === 'events') && segments[1]) {
    return { kind: 'event', id: segments[1] };
  }
  return null;
}

/** The in-app screen an invite opens — shared by the rich card and tapped links in message text. */
export function routeForInvite(invite: ParsedInvite): Href {
  if (invite.kind === 'movie') {
    return {
      pathname: '/movie/[id]',
      params: invite.openShowtimes ? { id: invite.id, openShowtimes: '1' } : { id: invite.id },
    };
  }
  if (invite.kind === 'event') return `/event/${invite.id}`;
  return `/refill/venue/${invite.id}`;
}

export function inviteChatPreview(kind: InviteKind): string {
  return INVITE_PREVIEW[kind];
}
