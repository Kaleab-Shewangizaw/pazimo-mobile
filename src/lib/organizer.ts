import { resolveImageUrl } from '@/lib/media';
import type { PazimoEvent } from '@/types/api';

/**
 * `organizer` is populated to `{_id,firstName,lastName,fullName,organizerProfile}`
 * on public reads, but comes through as a bare id string on some list endpoints —
 * so this has to check the shape before reading any name field off it.
 */
export function organizerDisplayName(event: Pick<PazimoEvent, 'organizer'>): string | null {
  const { organizer } = event;
  if (!organizer || typeof organizer === 'string') return null;

  const joined = [organizer.firstName, organizer.lastName].filter(Boolean).join(' ');
  return organizer.organizerProfile?.organization || organizer.fullName || joined || null;
}

/** Organization profile image, resolved to a usable URL. Falls back to initials when absent. */
export function organizerImageUrl(event: Pick<PazimoEvent, 'organizer'>): string | null {
  const { organizer } = event;
  if (!organizer || typeof organizer === 'string') return null;

  return resolveImageUrl(organizer.organizerProfile?.image);
}
