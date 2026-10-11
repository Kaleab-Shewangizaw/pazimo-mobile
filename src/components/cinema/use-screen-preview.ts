import type { VideoSource } from 'expo-video';

import { resolveImageUrl } from '@/lib/media';
import { useScreenVideo } from '@/queries/cinema-checkout';

/**
 * Looping backdrop for the auditorium's screen. Falls back to this bundled
 * clip until an admin uploads one from the Screen tab (`useScreenVideo`) —
 * so a fresh install never shows a blank screen, and every install picks up
 * whatever the admin sets without a release.
 */
const SCREEN_PREVIEW = require('@/assets/videos/c894168c4145c485105d7646f5a5d8c7.mp4');

/** The clip every seat map's screen plays — booking, sending seats, and "Show seats" alike. */
export function useScreenPreview(): VideoSource {
  const { video } = useScreenVideo();
  const url = resolveImageUrl(video);
  return url ? { uri: url } : SCREEN_PREVIEW;
}
