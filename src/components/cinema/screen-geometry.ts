/**
 * The cinema screen above every seat map, and its reflection on the floor —
 * one coordinate system for both (100 units wide, `PANEL_UNITS` tall), so
 * the reflection's top edge is *exactly* the screen's curved bottom edge.
 *
 * They used to be drawn in two separate boxes, each with its own viewBox and
 * its own vertical scale; the two curves were then nudged together with a
 * negative margin and never actually met — the reflection started on a flat
 * line partway up behind the screen. Sharing the units (and the box) is what
 * makes the join exact on every screen width.
 *
 *          ╭────────────────────╮      ← screen, y 0…44
 *       ╭──╯                    ╰──╮
 *      ╰──╮                    ╭───╯   ← shared contour: M 5,44 Q 50,28 95,44
 *        ░░░░░░░░░░░░░░░░░░░░░░░░      ← reflection, fading out by y 62
 */

/** The curved screen itself. Its bottom contour dips to y=36 in the middle. */
export const SCREEN_PATH = 'M 0,22 Q 50,0 100,22 L 95,44 Q 50,28 5,44 Z';

/** Starts on the screen's exact bottom contour, then widens toward the viewer. */
export const REFLECTION_PATH = 'M 5,44 Q 50,28 95,44 L 100,62 Q 50,55 0,62 Z';

/** How tall the screen's own box is, in units — its video fills exactly this. */
export const SCREEN_UNITS = 44;
/** Screen + reflection. */
export const PANEL_UNITS = 62;

/** One vertical unit in px — keeps the screen the 116px-for-48-units it's always been. */
export const UNIT_PX = 116 / 48;
export const PANEL_HEIGHT = PANEL_UNITS * UNIT_PX;
export const SCREEN_HEIGHT = SCREEN_UNITS * UNIT_PX;

/**
 * The reflected video is the screen's video flipped about y≈40 — the middle
 * of the bottom contour (36 at the center, 44 at the edges) — so the image
 * mirrors from right where the screen ends.
 */
export const MIRROR_AXIS_UNITS = 40;
export const REFLECTION_VIDEO_TOP = (2 * MIRROR_AXIS_UNITS - SCREEN_UNITS) * UNIT_PX;

/** The reflection fades from this opacity at the contour to nothing at the bottom. */
export const REFLECTION_START_OPACITY = 0.5;
/** Where (in units) the fade starts and ends. */
export const REFLECTION_FADE = { from: 36, to: PANEL_UNITS } as const;
