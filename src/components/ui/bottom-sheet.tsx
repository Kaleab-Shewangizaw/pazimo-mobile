import { type ReactNode, useEffect, useState } from 'react';
import { Animated, Dimensions, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/ui/glass';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A native-feeling glass modal sheet: backdrop fade, spring-in, drag-to-dismiss
 * from the handle. Built on RN's own `Modal` + classic `Animated` + `PanResponder`
 * rather than Reanimated shared values — this project runs with the React
 * Compiler on, which flags shared-value mutation inside gesture callbacks as an
 * immutability violation (see the same tradeoff in `ui/pressable.tsx`). Classic
 * `Animated` isn't compiler-tracked, so it sidesteps the conflict entirely.
 *
 * This is a reusable primitive: the same shape covers the ticket picker here
 * and the filter sheet planned for Discover.
 */

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_DISTANCE = 120;
/** PanResponder velocity is px/ms, so ~1.2 is a brisk downward flick. */
const DISMISS_VELOCITY = 1.2;
const SPRING = { useNativeDriver: true, speed: 16, bounciness: 4 } as const;
const FADE = { useNativeDriver: true, duration: 220 } as const;

export function BottomSheet({
  visible,
  onClose,
  children,
  maxHeight,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Caps sheet height so short content doesn't force it to the top of the screen. */
  maxHeight?: number;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Kept mounted for the duration of the close animation. `visible` is mirrored
  // into state during render (React's documented pattern for this) rather than
  // in a `useEffect`, since an unconditional setState in an effect body is the
  // anti-pattern the react-compiler lint rule flags.
  const [mounted, setMounted] = useState(visible);
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setMounted(true);
  }

  // Lazily-initialised state rather than `useRef(...).current`: the compiler
  // forbids reading a ref's `.current` during render, and these values are
  // otherwise only ever touched inside effects and gesture callbacks.
  const [translateY] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [backdrop] = useState(() => new Animated.Value(0));
  // A plain mutable box, not `useRef` — the compiler's ref-immutability check
  // flags *any* ref closed over by a callback built during render (including
  // one built inside a `useState` initialiser), even though this one is only
  // ever touched from gesture callbacks. A non-ref container sidesteps that
  // check entirely while behaving identically.
  const [dragStart] = useState(() => ({ value: 0 }));

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, { toValue: 0, ...SPRING }).start();
      Animated.timing(backdrop, { toValue: 1, ...FADE }).start();
    } else {
      Animated.timing(translateY, { toValue: SCREEN_HEIGHT, ...FADE }).start();
      Animated.timing(backdrop, { toValue: 0, ...FADE }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, translateY, backdrop]);

  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 4,
      onPanResponderGrant: () => {
        translateY.stopAnimation((value) => {
          dragStart.value = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const next = dragStart.value + gesture.dy;
        if (next >= 0) translateY.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldDismiss = gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY;
        if (shouldDismiss) {
          onClose();
        } else {
          Animated.spring(translateY, { toValue: 0, ...SPRING }).start();
        }
      },
    }),
  );

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>

      <Animated.View
        style={[styles.sheetWrap, { transform: [{ translateY }] }, maxHeight ? { maxHeight } : null]}>
        <Glass
          variant="regular"
          intensity={80}
          radius={Radius.xl}
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + Spacing.lg,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            },
          ]}>
          {/* Only the handle is a drag target — the rest of the sheet stays
              tappable (tier rows, buttons) without fighting the responder. */}
          <View {...panResponder.panHandlers} style={styles.dragArea}>
            <View style={[styles.handle, { backgroundColor: theme.hairline }]} />
          </View>
          {children}
        </Glass>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(2,2,3,0.6)' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: { paddingHorizontal: Spacing.lg },
  dragArea: { paddingVertical: Spacing.sm, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: Radius.pill },
});
