import { memo } from 'react';
import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';

import { FontFamily, FontSize, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextVariant =
  | 'display'
  | 'heading'
  | 'title'
  | 'callout'
  | 'body'
  | 'small'
  | 'caption'
  | 'label';

// Weight comes from the loaded family cut, never `fontWeight` — see the note
// on `FontFamily` in constants/theme.
const variants = StyleSheet.create({
  display: { fontSize: FontSize.display, fontFamily: FontFamily.bold, letterSpacing: -0.3 },
  heading: { fontSize: FontSize.heading, fontFamily: FontFamily.bold, letterSpacing: -0.2 },
  title: { fontSize: FontSize.title, fontFamily: FontFamily.bold },
  callout: { fontSize: FontSize.callout, fontFamily: FontFamily.semibold },
  body: { fontSize: FontSize.body, fontFamily: FontFamily.medium },
  small: { fontSize: FontSize.small, fontFamily: FontFamily.medium },
  caption: { fontSize: FontSize.caption, fontFamily: FontFamily.medium },
  label: { fontSize: FontSize.caption, fontFamily: FontFamily.bold, letterSpacing: 0.6 },
});

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: ThemeColor;
};

function TextImpl({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const theme = useTheme();
  return <RNText style={[variants[variant], { color: theme[color] }, style]} {...rest} />;
}

export const Text = memo(TextImpl);
