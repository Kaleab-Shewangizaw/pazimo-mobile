import { Platform } from 'react-native';

/**
 * Pazimo mobile is dark-only by design, matching the gold-on-black identity the
 * web app uses in its `.dark .brand-scope` (`--primary: #facc15`,
 * `--primary-foreground: #000000`).
 *
 * Surfaces are layered the way iOS does it: a near-black base, then progressively
 * lighter elevated fills, with translucent `glass*` tokens for the chrome that
 * floats above content. Gold is reserved for interactive and selected states —
 * it loses all meaning if it becomes a decorative colour.
 */

const gold = {
  400: '#FACC15',
  500: '#EAB308',
  deep: '#D4AF37',
};

const palette = {
  brand: gold[400],
  brandStrong: gold[500],
  brandDeep: gold.deep,
  brandTint: 'rgba(250, 204, 21, 0.14)',
  /** Text/icons drawn on top of a gold fill. */
  onBrand: '#0A0A0B',

  background: '#08080A',
  backgroundElevated: '#0F0F12',

  surface: '#16161A',
  surfaceMuted: '#1E1E23',

  glass: 'rgba(22, 22, 26, 0.55)',
  glassStrong: 'rgba(12, 12, 15, 0.80)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  hairline: 'rgba(255, 255, 255, 0.08)',

  text: '#F5F5F7',
  textSecondary: '#A1A1AA',
  textMuted: '#6B6B76',

  success: '#34D399',
  danger: '#FB7185',
  warning: gold[400],

  /** Scrim under text laid over cover art. */
  scrim: 'rgba(0, 0, 0, 0.62)',
  skeleton: 'rgba(255, 255, 255, 0.06)',
} as const;

/**
 * Both keys resolve to the same palette so any `Colors[scheme]` lookup stays
 * correct while the app is locked to dark. `userInterfaceStyle` in app.json
 * pins the system chrome to match.
 */
export const Colors = { dark: palette, light: palette } as const;

export type ThemeName = keyof typeof Colors;
export type Theme = typeof palette;
export type ThemeColor = keyof Theme;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Generous corners throughout — the iOS continuous-corner look. */
export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const FontSize = {
  caption: 12,
  small: 13,
  body: 15,
  callout: 17,
  title: 20,
  heading: 26,
  display: 32,
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace', serif: 'Georgia' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace', serif: 'serif' },
  web: {
    sans: 'var(--font-display)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
    serif: 'Georgia, "Times New Roman", serif',
  },
})!;

/** Card art ratios, fixed so the feed never reflows when images load. */
export const AspectRatio = {
  /** The hero carousel — tall, editorial, closer to a poster than a widescreen strip. */
  banner: 4 / 5,
  card: 3 / 2,
  hero: 4 / 3,
} as const;
