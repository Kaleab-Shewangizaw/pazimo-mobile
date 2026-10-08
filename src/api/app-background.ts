import { getData } from '@/api/client';

export type AppBackgroundImage = { id: string; url: string; active: boolean };

export type GlassStyle = {
  /** `#RRGGBB`, combined with `tintOpacity` into the glass tint. */
  tintColor: string;
  tintOpacity: number;
  /** BlurView intensity (0–100). Ignored by iOS 26+ Liquid Glass. */
  blurIntensity: number;
};

export type AppBackground = {
  images: AppBackgroundImage[];
  /** expo-image `blurRadius` for the photo. */
  blurRadius: number;
  /** Opacity (0–1) of the dark wash over the photo. */
  dimOpacity: number;
  /**
   * The glass on floating controls. Optional because a backend from before
   * this setting existed doesn't send it.
   */
  glass?: { buttons: GlassStyle; chips: GlassStyle };
};

/** Public, set by admins from the web dashboard (Admin → App → Appearance). */
export function fetchAppBackground(): Promise<AppBackground> {
  return getData<AppBackground>('/config/app-background');
}
