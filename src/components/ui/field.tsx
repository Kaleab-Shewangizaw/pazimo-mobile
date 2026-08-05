import { memo, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A labelled text field in the app's material: a translucent fill that brightens
 * its border on focus, with the error line reserved *inside* the block so a
 * validation message never reflows the form under the user's thumb.
 */

export type FieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Fixed text inside the field, e.g. a dialling code. */
  prefix?: string;
  error?: string | null;
  hint?: string;
};

function FieldImpl({ label, prefix, error, hint, onFocus, onBlur, ...rest }: FieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.danger
    : focused
      ? 'rgba(255,255,255,0.55)'
      : theme.glassBorder;

  return (
    <View style={styles.block}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <View style={[styles.box, { borderColor, backgroundColor: 'rgba(255,255,255,0.06)' }]}>
        {prefix ? (
          <Text variant="body" color="textSecondary" style={styles.prefix}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.brand}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
      </View>
      {error || hint ? (
        <Text variant="caption" color={error ? 'danger' : 'textMuted'}>
          {error ?? hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 6 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
  },
  prefix: { marginRight: Spacing.xs },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSize.body,
    fontFamily: FontFamily.medium,
  },
});

export const Field = memo(FieldImpl);
