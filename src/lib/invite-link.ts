import * as Linking from 'expo-linking';

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
 * config.
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

// Computed once — the scheme a real deep link into this app will carry,
// whether that's the dev-client `exp+pazimomobile://` or the standalone
// `pazimomobile://` from app.json. Used to reject arbitrary pasted URLs
// (a different scheme can never be one of ours) before bothering to match
// path segments.
const APP_SCHEME = Linking.parse(Linking.createURL('/')).scheme;

const URL_LIKE = /^[a-z][a-z0-9+.-]*:\/\//i;

export function buildInviteLink(
  kind: InviteKind,
  id: string,
  opts?: { openShowtimes?: boolean },
): string {
  return Linking.createURL(`/${INVITE_ROUTE[kind]}/${id}`, {
    queryParams: opts?.openShowtimes ? { openShowtimes: '1' } : undefined,
  });
}

export function parseInviteLink(text: string): ParsedInvite | null {
  const trimmed = text.trim();
  if (!trimmed || !URL_LIKE.test(trimmed)) return null;

  let parsed: Linking.ParsedURL;
  try {
    parsed = Linking.parse(trimmed);
  } catch {
    return null;
  }
  if (parsed.scheme !== APP_SCHEME) return null;

  const segments = (parsed.path ?? '').split('/').filter(Boolean);

  if (segments[0] === 'refill' && segments[1] === 'venue' && segments[2]) {
    return { kind: 'venue', id: segments[2] };
  }
  if (segments[0] === 'movie' && segments[1]) {
    return {
      kind: 'movie',
      id: segments[1],
      openShowtimes: parsed.queryParams?.openShowtimes === '1',
    };
  }
  if (segments[0] === 'event' && segments[1]) {
    return { kind: 'event', id: segments[1] };
  }
  return null;
}

export function inviteChatPreview(kind: InviteKind): string {
  return INVITE_PREVIEW[kind];
}
