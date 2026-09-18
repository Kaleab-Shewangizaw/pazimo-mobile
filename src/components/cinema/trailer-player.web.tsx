import { Ionicons } from '@expo/vector-icons';
import { createElement, memo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from 'react-native';

import { TrailerControls, TrailerFullscreenFrame } from '@/components/cinema/trailer-controls';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import type { Trailer } from '@/lib/trailer';

/**
 * The web build of the trailer player.
 *
 * `react-native-webview` ships a dummy component on web ("does not support
 * this platform") that never fires `onLoadEnd`/`onError` — the native player
 * would sit behind its own loading spinner forever. The web platform already
 * has a real embeddable element for this, so this file (picked automatically
 * over trailer-player.tsx by Metro's `.web` extension resolution) renders a
 * plain DOM `iframe`/`video` instead of going through the native bridge.
 */

export type TrailerPlayerProps = {
  trailer: NonNullable<Trailer>;
  width: number;
  height: number;
  /** Stops playback and hands control back to the poster. */
  onClose: () => void;
};

function TrailerPlayerImpl({ trailer, width, height, onClose }: TrailerPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const window = useWindowDimensions();

  const onLoad = () => setLoading(false);
  const onError = () => {
    setLoading(false);
    setFailed(true);
  };

  // A fresh iframe/video element loads fresh, so switching modes resets the
  // spinner right along with it.
  const setFullscreenMode = (next: boolean) => {
    setFullscreen(next);
    setLoading(true);
    setFailed(false);
  };

  const frameSize = fullscreen ? { width: window.width, height: window.height } : { width, height };

  return (
    <TrailerFullscreenFrame fullscreen={fullscreen} onRequestClose={() => setFullscreenMode(false)}>
      <View style={[styles.frame, frameSize, fullscreen && styles.fullscreenFrame]}>
        {failed ? (
          <View style={styles.notice}>
            <Ionicons name="cloud-offline-outline" size={28} color="rgba(255,255,255,0.5)" />
            <Text variant="small" color="textSecondary" style={styles.noticeText}>
              The trailer would not load.
            </Text>
          </View>
        ) : trailer.kind === 'file' ? (
          createElement('video', {
            src: trailer.url,
            controls: true,
            autoPlay: true,
            playsInline: true,
            style: mediaStyle,
            onLoadedData: onLoad,
            onError,
          })
        ) : (
          createElement('iframe', {
            src: trailer.embedUrl,
            style: mediaStyle,
            allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
            allowFullScreen: true,
            frameBorder: 0,
            // Cross-origin embeds never report failure to the parent frame, so
            // this is best-effort — it clears the spinner once the frame's
            // document has loaded, whatever it ends up showing.
            onLoad,
          })
        )}

        {loading && !failed ? (
          <View style={styles.notice} pointerEvents="none">
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : null}

        <TrailerControls
          fullscreen={fullscreen}
          onClose={onClose}
          onToggleFullscreen={() => setFullscreenMode(!fullscreen)}
        />
      </View>
    </TrailerFullscreenFrame>
  );
}

const mediaStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 } as const;

const styles = StyleSheet.create({
  frame: { borderRadius: 32, overflow: 'hidden', backgroundColor: '#000000' },
  fullscreenFrame: { borderRadius: 0 },
  notice: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: '#000000',
  },
  noticeText: { textAlign: 'center' },
});

export const TrailerPlayer = memo(TrailerPlayerImpl);
