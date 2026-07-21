import { memo } from 'react';
import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';

import { FontSize, type ThemeColor } from '@/constants/theme';
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

const variants = StyleSheet.create({
  display: { fontSize: FontSize.display, fontWeight: '800', letterSpacing: -0.6 },
  heading: { fontSize: FontSize.heading, fontWeight: '700', letterSpacing: -0.4 },
  title: { fontSize: FontSize.title, fontWeight: '700', letterSpacing: -0.2 },
  callout: { fontSize: FontSize.callout, fontWeight: '600' },
  body: { fontSize: FontSize.body, fontWeight: '400' },
  small: { fontSize: FontSize.small, fontWeight: '400' },
  caption: { fontSize: FontSize.caption, fontWeight: '500' },
  label: { fontSize: FontSize.caption, fontWeight: '700', letterSpacing: 0.6 },
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
