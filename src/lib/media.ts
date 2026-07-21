import { Env } from '@/lib/env';

/**
 * Image fields come back in three shapes: a full URL (Cloudinary), a server
 * path (`/uploads/x.png`), or a bare seed filename (`default-event.jpg`).
 * Only the middle case is resolvable; the seed default has no file behind it.
 */
export function resolveImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path === 'default-event.jpg') return null;
  return `${Env.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function eventCoverUrl(coverImages?: string[] | null): string | null {
  return resolveImageUrl(coverImages?.[0]);
}
