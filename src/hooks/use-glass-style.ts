import type { GlassStyle } from '@/api/app-background';
import { GLASS_CONTROL_BLUR, GLASS_CONTROL_TINT } from '@/constants/appearance';
import { useAppBackground } from '@/queries/app-background';

export type GlassKind = 'buttons' | 'chips';

const FALLBACK = { tint: GLASS_CONTROL_TINT, blur: GLASS_CONTROL_BLUR } as const;

function toRgba({ tintColor, tintOpacity }: GlassStyle): string | null {
  const match = /^#([0-9a-f]{6})$/i.exec(tintColor);
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${tintOpacity})`;
}

/**
 * The glass material admins set from the web dashboard (Admin → App →
 * Appearance): `buttons` for every glass button, icon button and the inputs
 * that share their look; `chips` for the labels riding on cards.
 *
 * Reads the same cached request as the page backdrop, so the many controls
 * calling this cost one fetch between them. Until it lands (or if it fails)
 * the hand-tuned defaults in constants/appearance.ts apply.
 */
export function useGlassStyle(kind: GlassKind): { tint: string; blur: number } {
  const { data } = useAppBackground();
  const style = data?.glass?.[kind];
  if (!style) return FALLBACK;
  return { tint: toRgba(style) ?? FALLBACK.tint, blur: style.blurIntensity };
}
