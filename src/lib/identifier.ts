/**
 * Mirrors the backend's own gating in `ticketShareService.searchRecipients` —
 * a query only ever resolves as an exact username or an exact (loosely
 * formatted) phone number, never a fuzzy prefix. Used client-side so search
 * requests aren't fired at all while the input is obviously incomplete,
 * rather than firing on every keystroke and letting the server say no.
 */
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const PHONE_PATTERN = /^[+\d][\d\s\-()]{6,}$/;

export function looksLikeUsername(text: string): boolean {
  return USERNAME_PATTERN.test(text.trim());
}

export function looksLikePhoneNumber(text: string): boolean {
  return PHONE_PATTERN.test(text.trim());
}

/** Whether this input could plausibly resolve to an exact search match. */
export function isResolvableIdentifier(text: string): boolean {
  const trimmed = text.trim();
  return looksLikeUsername(trimmed) || looksLikePhoneNumber(trimmed);
}
