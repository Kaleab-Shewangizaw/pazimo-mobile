import { getData } from '@/api/client';

export type AppBackgroundImage = { id: string; url: string; active: boolean };

export type AppBackground = {
  images: AppBackgroundImage[];
  /** expo-image `blurRadius` for the photo. */
  blurRadius: number;
  /** Opacity (0–1) of the dark wash over the photo. */
  dimOpacity: number;
};

/** Public, set by admins from the web dashboard (Admin → App Background). */
export function fetchAppBackground(): Promise<AppBackground> {
  return getData<AppBackground>('/config/app-background');
}
