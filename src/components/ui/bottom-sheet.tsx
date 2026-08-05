import { type ReactNode, useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
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
/** Page still visible above a full-height sheet, so it never reads as a screen. */
const TOP_GAP = Spacing.xxl;
/** The handle strip: `Spacing.sm` above and below a 4pt bar. */
const DRAG_AREA_HEIGHT = Spacing.sm * 2 + 4;
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

  // Kept mounted for the duration of the close animation, then unmounted so a
  // hidden sheet can't intercept touches. This is a genuine synchronize-with-
  // an-external-system effect (starting/stopping an imperative animation), so
  // the setState inside it is the correct tool, not the anti-pattern the
  // react-compiler lint rule usually flags — suppressed with that reasoning.
  const [mounted, setMounted] = useState(visible);
  const [translateY] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [backdrop] = useState(() => new Animated.Value(0));
  // A plain mutable box, not `useRef` — the compiler's ref-immutability check
  // flags *any* ref closed over by a callback built during render (including
  // one built inside a `useState` initialiser), even though this one is only
  // ever touched from gesture callbacks. A non-ref container sidesteps that
  // check entirely while behaving identically.
  const [dragStart] = useState(() => ({ value: 0 }));
  // A sheet with fields in it has to get out of the keyboard's way. RN's
  // `adjustResize` doesn't reach inside a `statusBarTranslucent` Modal, so the
  // lift is measured from the keyboard itself.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const shown = Keyboard.addListener(showEvent, (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hidden = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the sheet must be mounted before the open animation can run; there's no prior render this could instead be computed in.
      setMounted(true);
    }

    const translateAnim = visible
      ? Animated.spring(translateY, { toValue: 0, ...SPRING })
      : Animated.timing(translateY, { toValue: SCREEN_HEIGHT, ...FADE });
    const backdropAnim = Animated.timing(backdrop, { toValue: visible ? 1 : 0, ...FADE });

    translateAnim.start();
    if (visible) {
      backdropAnim.start();
    } else {
      backdropAnim.start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }

    // Stopping the previous run's animations before the next one starts is
    // what makes this safe to re-open quickly: without it, a close animation's
    // completion callback can fire *after* a newer open animation has already
    // started, incorrectly unmounting the just-opened sheet. `.stop()` makes a
    // pending callback report `finished: false`, so the guard above skips it
    // even if it still fires after being stopped.
    return () => {
      translateAnim.stop();
      backdropAnim.stop();
    };
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

  // Tall content scrolls inside the sheet rather than pushing its top edge off
  // the screen — and the ceiling drops as the keyboard rises, so the field
  // being typed into stays in view. The drag strip is the sheet's only other
  // row, so it is what separates the sheet's budget from the scroller's.
  const contentCeiling =
    (maxHeight ?? SCREEN_HEIGHT - insets.top - TOP_GAP) - keyboardHeight - DRAG_AREA_HEIGHT;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheetWrap,
          { transform: [{ translateY }], paddingBottom: keyboardHeight },
        ]}>
        <Glass
          variant="regular"
          intensity={80}
          radius={Radius.xl}
          style={styles.sheet}>
          {/* Only the handle is a drag target — the rest of the sheet stays
              tappable (tier rows, buttons) without fighting the responder. */}
          <View {...panResponder.panHandlers} style={styles.dragArea}>
            <View style={[styles.handle, { backgroundColor: theme.hairline }]} />
          </View>
          <ScrollView
            style={{ maxHeight: Math.max(contentCeiling, 0) }}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: (keyboardHeight > 0 ? 0 : insets.bottom) + Spacing.lg },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            {children}
          </ScrollView>
        </Glass>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(2,2,3,0.6)' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  // The bottom corners meet the screen edge, so rounding them would show the
  // page through two notches under the sheet.
  sheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  content: { paddingHorizontal: Spacing.lg },
  dragArea: { paddingVertical: Spacing.sm, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: Radius.pill },
});
