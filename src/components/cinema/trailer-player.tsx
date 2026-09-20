import { Ionicons } from '@expo/vector-icons';
import { memo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';

import { TrailerControls, TrailerFullscreenFrame } from '@/components/cinema/trailer-controls';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { type Trailer, trailerHtml, trailerOrigin } from '@/lib/trailer';

/**
 * The trailer, played in the space the poster was occupying.
 *
 * A WebView rather than a native player because the source is almost always a
 * YouTube watch link, and YouTube does not serve a stream any native player can
 * open — the embed *is* the API. The HTML is handed over as a string rather
 * than loaded by URL so the page around the iframe is ours: black, edge to
 * edge, no scroll and no chrome bleeding in around the video.
 */

export type TrailerPlayerProps = {
  trailer: NonNullable<Trailer>;
  /** Matches the poster it replaces, so the swap doesn't shift the layout. */
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

  // A fresh WebView instance loads fresh, so switching modes resets the
  // spinner right along with it rather than via an effect watching `fullscreen`.
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
        ) : (
          <WebView
            source={{ html: trailerHtml(trailer), baseUrl: trailerOrigin(trailer) }}
            style={styles.web}
            // Raw `html` sources are blocked by the default http(s)-only
            // whitelist unless this is opened up — see react-native-webview's
            // guide on the `html` source prop.
            originWhitelist={['*']}
            // The embed decides when to start; without this iOS refuses autoplay
            // and Android shows a dead first frame.
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo
            javaScriptEnabled
            domStorageEnabled
            // No back-forward gestures or scrolling inside a 200pt video frame.
            scrollEnabled={false}
            bounces={false}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
          />
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

const styles = StyleSheet.create({
  frame: { borderRadius: 32, overflow: 'hidden', backgroundColor: '#000000' },
  fullscreenFrame: { borderRadius: 0 },
  web: { flex: 1, backgroundColor: '#000000' },
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
