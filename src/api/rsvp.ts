import { getData, postData } from '@/api/client';
import type { RsvpAnswer, RsvpForm, RsvpResponse } from '@/types/api';

/**
 * All three routes are public and take no auth — a guest never needs an
 * account to browse or submit an RSVP form. Rate-limited server-side (300
 * reads/IP/5min, 20 submissions/IP/10min); a 429 surfaces through the normal
 * `ApiError` path, nothing bespoke needed here.
 */

/** `GET /rsvp/public/forms` — max 50, defaults to 6 server-side if omitted. */
export function fetchPublishedRsvpForms(limit = 6): Promise<RsvpForm[]> {
  return getData<RsvpForm[]>('/rsvp/public/forms', { params: { limit } });
}

export function fetchRsvpForm(publicId: string): Promise<RsvpForm> {
  return getData<RsvpForm>(`/rsvp/public/${publicId}`);
}

export type RsvpSubmission = {
  answers: Record<string, RsvpAnswer>;
  attendee: { fullName: string; email: string; phone: string };
  metadata?: { sourceUrl?: string; referrer?: string };
};

export function submitRsvpResponse(
  publicId: string,
  payload: RsvpSubmission,
): Promise<RsvpResponse> {
  return postData<RsvpResponse>(`/rsvp/public/${publicId}/responses`, payload);
}
