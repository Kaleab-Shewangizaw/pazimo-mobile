import { Colors, type Theme, type ThemeName } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeName(): ThemeName {
  const scheme = useColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}

export function useTheme(): Theme {
  return Colors[useThemeName()];
}
