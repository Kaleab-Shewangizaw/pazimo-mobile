import { RefreshControl, type RefreshControlProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Android draws the spinner on a filled disc; iOS just tints the arms. */
const SPINNER = ['#FFFFFF'];

/**
 * Pull-to-refresh, themed for the dark page: white arms on iOS, and on Android
 * a white arrow on a near-black disc — its default disc is white, which would
 * otherwise flash as a bright coin over the ambient backdrop.
 *
 * Callers pass `progressViewOffset` so the spinner clears whatever floating
 * chrome that screen has.
 *
 * Every prop is forwarded because ScrollView *clones* this element on Android,
 * injecting its own `style` plus the scroll content as children — swallowing
 * either one blanks the screen.
 */
export function PageRefreshControl(props: RefreshControlProps) {
  const theme = useTheme();

  return (
    <RefreshControl
      tintColor="#FFFFFF"
      colors={SPINNER}
      progressBackgroundColor={theme.surface}
      {...props}
    />
  );
}
