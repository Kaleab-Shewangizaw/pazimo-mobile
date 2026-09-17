import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Radius } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { useTheme } from '@/hooks/use-theme';

/** The pushed-screen back button — same shape as `shares.tsx`'s, shared so every account-menu screen matches it exactly. */
function HeaderBackButtonImpl() {
  const theme = useTheme();
  const goBack = useGoBack();

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={goBack}
      pressedScale={0.9}
      style={[styles.button, { backgroundColor: theme.surfaceMuted }]}>
      <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const HeaderBackButton = memo(HeaderBackButtonImpl);
