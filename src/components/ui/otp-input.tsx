import { memo, useRef } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const CODE_LENGTH = 6;

/**
 * Six visual boxes with one real, fully transparent `TextInput` stretched on
 * top capturing the actual keystrokes — the standard RN trick, since there is
 * no native segmented-code field. `textContentType`/`autoComplete` are what
 * let iOS/Android offer the SMS autofill chip above the keyboard.
 */
function OtpInputImpl({
  value,
  onChangeText,
  autoFocus,
}: {
  value: string;
  onChangeText: (code: string) => void;
  autoFocus?: boolean;
}) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={styles.wrap}>
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
            <Text variant="title">{digit}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        maxLength={CODE_LENGTH}
        autoFocus={autoFocus}
        style={[StyleSheet.absoluteFill, styles.hiddenInput]}
        caretHidden
      />
    </View>
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
});

export const OtpInput = memo(OtpInputImpl);
