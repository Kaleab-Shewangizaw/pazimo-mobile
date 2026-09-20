import { type ReactNode, memo } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassIconButton } from '@/components/ui/glass-button';
import { Spacing } from '@/constants/theme';

/**
 * The overlay riding on top of the trailer video, shared by both the native
 * (WebView) and web (iframe) players so the fullscreen/close behaviour reads
 * identically regardless of which embed is doing the actual playback.
 */
function TrailerControlsImpl({
  fullscreen,
  onClose,
  onToggleFullscreen,
}: {
  fullscreen: boolean;
  /** Stops playback entirely, handing control back to the poster. */
  onClose: () => void;
  onToggleFullscreen: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.controls, { paddingTop: (fullscreen ? insets.top : 0) + Spacing.sm }]}>
      <GlassIconButton icon="close" accessibilityLabel="Close trailer" onPress={onClose} />
      <GlassIconButton
        icon={fullscreen ? 'contract' : 'expand'}
        accessibilityLabel={fullscreen ? 'Exit full screen' : 'Full screen'}
        onPress={onToggleFullscreen}
      />
    </View>
  );
}

export const TrailerControls = memo(TrailerControlsImpl);

/**
 * Widens the trailer to the full window in a native `Modal` when fullscreen
 * is on, otherwise renders its children right where the poster's footprint
 * already sits. The video element itself lives inside `children` in both
 * cases — since the `Modal` boundary changes the tree's root type, React
 * remounts it either way, so the embed restarts from the top on each toggle.
 * Not worth fighting: keeping one shared WebView/iframe instance alive across
 * an inline<->fullscreen move would mean tracking the poster's on-screen
 * position through scroll, for a stutter that only shows up once per toggle.
 */
function TrailerFullscreenFrameImpl({
  fullscreen,
  onRequestClose,
  children,
}: {
  fullscreen: boolean;
  onRequestClose: () => void;
  children: ReactNode;
}) {
  if (!fullscreen) return <>{children}</>;

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>{children}</View>
    </Modal>
  );
}

export const TrailerFullscreenFrame = memo(TrailerFullscreenFrameImpl);

const styles = StyleSheet.create({
  controls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  backdrop: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
});
