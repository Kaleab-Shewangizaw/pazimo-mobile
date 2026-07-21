import { Platform } from 'react-native';

/**
 * Glassmorphism depends on layered translucency, so surfaces are defined as
 * rgba over the page background rather than as opaque hex. The `glass*` tokens
 * are the ones that sit on top of blur; `surface*` are the cheap opaque
 * equivalents used inside scrolling lists, where real blur is too expensive.
 */

const brand = {
  400: '#4EA3F4',
  500: '#208AEF',
  600: '#1B74CC',
};

export const Colors = {
  light: {
    brand: brand[500],
    brandStrong: brand[600],
    brandTint: 'rgba(32, 138, 239, 0.16)',

    background: '#F6F7F9',
    backgroundElevated: '#FFFFFF',

    surface: '#FFFFFF',
    surfaceMuted: '#EFF1F4',

    glass: 'rgba(255, 255, 255, 0.62)',
    glassStrong: 'rgba(255, 255, 255, 0.82)',
    glassBorder: 'rgba(255, 255, 255, 0.75)',
    hairline: 'rgba(15, 23, 42, 0.10)',

    text: '#0B1220',
    textSecondary: '#5A6472',
    textMuted: '#8B95A3',
    onBrand: '#FFFFFF',

    success: '#0F9D58',
    danger: '#D93025',
    warning: '#E37400',

    /** Scrim under text laid over cover art. */
    scrim: 'rgba(6, 10, 18, 0.55)',
    skeleton: 'rgba(15, 23, 42, 0.07)',
  },
  dark: {
    brand: brand[400],
    brandStrong: brand[500],
    brandTint: 'rgba(78, 163, 244, 0.18)',

    background: '#07090D',
    backgroundElevated: '#0E1218',

    surface: '#141922',
    surfaceMuted: '#1B212C',

    glass: 'rgba(24, 30, 40, 0.58)',
    glassStrong: 'rgba(20, 25, 34, 0.80)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    hairline: 'rgba(255, 255, 255, 0.10)',

    text: '#F4F6F8',
    textSecondary: '#A5AEBB',
    textMuted: '#6F7987',
    onBrand: '#FFFFFF',

    success: '#3DDC84',
    danger: '#FF6B5E',
    warning: '#FFB020',

    scrim: 'rgba(0, 0, 0, 0.60)',
    skeleton: 'rgba(255, 255, 255, 0.07)',
  },
} as const;

export type ThemeName = keyof typeof Colors;
export type Theme = (typeof Colors)[ThemeName];
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

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
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
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'var(--font-display)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
})!;

/** Card art ratios, fixed so the feed never reflows when images load. */
export const AspectRatio = {
  banner: 16 / 9,
  card: 3 / 2,
  hero: 4 / 3,
} as const;
