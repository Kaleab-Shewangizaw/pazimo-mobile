/**
 * Hand-tuned look-and-feel knobs, gathered so the glass and the page backdrop
 * can be adjusted from one place.
 *
 * Tints are rgba colours: the last number (alpha, 0–1) is how strong the tone
 * is. Raise it for a more solid, coloured glass; lower it for clearer glass.
 * On iOS 26+ tints are fed into native Liquid Glass; elsewhere they are a fill
 * over a blur.
 *
 * Blur intensities (0–100) only affect the non-Liquid-Glass path: Android,
 * and iOS before 26. Liquid Glass sets its own blur.
 */

/** Liquid glass on buttons, pills and inputs (GlassIconButton, search fields, chat header). */
export const GLASS_CONTROL_TINT = 'rgba(255, 255, 255, 0.24)';
export const GLASS_CONTROL_BLUR = 45;

/**
 * Floating tab bar. `LIQUID` is used on iOS 26+ — undefined means untinted,
 * pure system glass. `FALLBACK` is the fill used everywhere else.
 */
export const TAB_BAR_TINT_LIQUID: string | undefined = undefined;
export const TAB_BAR_TINT_FALLBACK = 'rgba(12, 12, 14, 0.68)';
export const TAB_BAR_BLUR = 65;

/** Page headers that use the blurred bar (every GlassHeader except Home). */
export const HEADER_BLUR = 60;

/** Any `<Glass>` that doesn't pass its own `intensity`. */
export const GLASS_DEFAULT_BLUR = 55;

/**
 * Page backdrop (AmbientBackground). Blur and darkness are set by admins in
 * the web dashboard (Admin → App Background); these are only used until the
 * app has fetched those values, or if the request fails.
 */
export const BACKGROUND_DEFAULT_BLUR_RADIUS = 16;
export const BACKGROUND_DEFAULT_DIM = 0.75;

/**
 * Frosted sheet between the photo and the page — a second, uniform blur on
 * top of the photo's own. Not admin-controlled. 0 disables it.
 */
export const BACKGROUND_FROST_INTENSITY = 60;
