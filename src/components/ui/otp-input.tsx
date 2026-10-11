import { memo, useCallback, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const CODE_LENGTH = 6;

/**
 * Six visual boxes with one real, fully transparent `TextInput` stretched on
 * top capturing the actual keystrokes — the standard RN trick, since there is
 * no native segmented-code field. `textContentType`/`autoComplete` are what
 * let iOS/Android offer the SMS autofill chip above the keyboard.
 *
 * `secure` turns it into a PIN pad (the wallet PIN): dots instead of digits,
 * and no SMS autofill — a PIN must never be offered from a text message.
 *
 * Taps go through a Pressable rather than straight to the input: after a
 * `Keyboard.dismiss()` (every Pay button does one) Android can leave the input
 * focused with the keyboard hidden, and tapping an already-focused input never
 * brings the keyboard back — the pad just looked dead after a wrong PIN.
 */
function OtpInputImpl({
  value,
  onChangeText,
  autoFocus,
  secure,
  accessibilityLabel,
  refocusOn,
}: {
  value: string;
  onChangeText: (code: string) => void;
  autoFocus?: boolean;
  secure?: boolean;
  accessibilityLabel?: string;
  /** Brings the keyboard back whenever this changes to something truthy — pass the field's error. */
  refocusOn?: unknown;
}) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);

  const focus = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    if (input.isFocused()) {
      // Focused but keyboard hidden: re-focusing alone is a no-op, so cycle it.
      input.blur();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      input.focus();
    }
  }, []);

  useEffect(() => {
    if (refocusOn) focus();
  }, [refocusOn, focus]);

  return (
    <Pressable style={styles.wrap} onPress={focus} accessible={false}>
      {Array.from({ length: CODE_LENGTH }).map((_, index) => {
        const digit = value[index] ?? '';
        const isCursor = index === value.length;
        return (
          <View
            key={index}
            style={[
              styles.box,
              {
                borderColor: isCursor ? 'rgba(255,255,255,0.55)' : theme.glassBorder,
                backgroundColor: 'rgba(255,255,255,0.06)',
              },
            ]}>
            {secure ? (
              digit ? <View style={[styles.dot, { backgroundColor: theme.text }]} /> : null
            ) : (
              <Text variant="title">{digit}</Text>
            )}
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH))}
        keyboardType="number-pad"
        textContentType={secure ? 'none' : 'oneTimeCode'}
        autoComplete={secure ? 'off' : Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        secureTextEntry={secure}
        accessibilityLabel={accessibilityLabel}
        maxLength={CODE_LENGTH}
        autoFocus={autoFocus}
        style={[StyleSheet.absoluteFill, styles.hiddenInput]}
        pointerEvents="none"
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between' },
  box: {
    width: 44,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: { opacity: 0 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});

export const OtpInput = memo(OtpInputImpl);
