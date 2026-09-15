import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GLASS_SHADOW } from '@/components/ui/glass-button';
import { Touchable } from '@/components/ui/pressable';
import { Radius, Spacing } from '@/constants/theme';
import { TabBar } from '@/constants/layout';
import { useTheme } from '@/hooks/use-theme';

const SIZE = 56;

export type NewChatFabProps = {
  onPress: () => void;
};

/**
 * The Telegram-style "compose" button — the one prominent action on the
 * Chats tab, separate from the header's search icon (that finds someone by
 * username/phone; this opens the same recipient picker but reads as "start
 * something new" rather than "look someone up"). No floating-action-button
 * precedent exists elsewhere in this app, so this is solid `theme.brand`
 * (the app's one interactive/selected color) rather than the translucent
 * glass secondary chrome uses, to read as the primary action it is.
 */
function NewChatFabImpl({ onPress }: NewChatFabProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel="Start a new chat"
      onPress={onPress}
      haptic
      pressedScale={0.92}
      style={[
        styles.fab,
        GLASS_SHADOW,
        {
          backgroundColor: theme.brand,
          bottom: insets.bottom + TabBar.height + TabBar.floatGap + Spacing.md,
        },
      ]}>
      <Ionicons name="chatbox-ellipses" size={24} color={theme.onBrand} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: SIZE,
    height: SIZE,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const NewChatFab = memo(NewChatFabImpl);
