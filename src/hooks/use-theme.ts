import { Colors, type Theme, type ThemeName } from '@/constants/theme';

/**
 * The app is dark-only, so this ignores the system scheme rather than reading
 * it. Kept as a hook so screens do not need to change if a light theme is ever
 * reintroduced.
 */
export function useThemeName(): ThemeName {
  return 'dark';
}

export function useTheme(): Theme {
  return Colors.dark;
}
