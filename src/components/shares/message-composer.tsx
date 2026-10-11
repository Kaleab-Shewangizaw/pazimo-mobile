import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// Per-icon subpath imports — see `app/(tabs)/_layout.tsx` for why not the barrel.
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { PaperPlaneTiltIcon } from 'phosphor-react-native/src/icons/PaperPlaneTilt';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { memo, useCallback, useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text as RNText, TextInput, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSendMessage } from '@/queries/messages';

const MESSAGE_LIMIT = 2000;

export type EditingMessage = { id: string; text: string };

export type MessageComposerProps = {
  counterpartyId: string;
  /** Opens the existing ticket/drink/cinema-item picker — unchanged, just no longer the only way to say something. */
  onAttach: () => void;
  /** Non-null while editing an existing message instead of composing a new one. */
  editing?: EditingMessage | null;
  onSaveEdit?: (text: string) => Promise<unknown>;
  onCancelEdit?: () => void;
  editSubmitting?: boolean;
};

/** The footer row: attach (unchanged `ShareItemSheet` entry point) + a plain text field + send — or, while `editing` is set, the same field pre-filled and repurposed to save that edit instead. */
function MessageComposerImpl({
  counterpartyId,
  onAttach,
  editing,
  onSaveEdit,
  onCancelEdit,
  editSubmitting = false,
}: MessageComposerProps) {
  const theme = useTheme();
  const [text, setText] = useState('');
  // Tracks the field's actual content height so it grows line-by-line as you
  // type instead of sitting at a fixed size — see the mirror `RNText` below
  // for how this gets measured.
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const { submit, submitting, error } = useSendMessage();

  // The field the user sees can't measure its own natural content height —
  // once its `height` style has grown, the platform reports that same
  // height back on the next read even after text shrinks (`scrollHeight`
  // on web, the constrained layout pass on native), so a visible field can
  // grow but never shrink. An invisible, unconstrained clone of the text
  // sidesteps that: it always lays out at its true content height, which
  // `onLayout` reports fresh on every change, and that's what drives the
  // visible field's height instead.
  const mirrorText = text.length === 0 ? ' ' : text.endsWith('\n') ? `${text} ` : text;

  // Reset the field's text when a *different* message starts being edited —
  // done during render (the React-documented "adjusting state when a prop
  // changes" pattern), not an effect, so the compiler doesn't flag a
  // setState-in-effect cascade for what's really just derived state.
  const editingId = editing?.id ?? null;
  const [syncedEditingId, setSyncedEditingId] = useState<string | null>(null);
  if (editingId !== syncedEditingId) {
    setSyncedEditingId(editingId);
    setText(editingId ? (editing?.text ?? '') : '');
    // Reset to one line — the mirror's `onLayout` re-measures and grows it
    // again once the new value actually renders, same as typing would.
    setInputHeight(MIN_INPUT_HEIGHT);
  }

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (editing) {
      if (editSubmitting) return;
      const saved = await onSaveEdit?.(trimmed);
      if (saved) {
        setText('');
        setInputHeight(MIN_INPUT_HEIGHT);
        onCancelEdit?.();
      }
      return;
    }
    if (submitting) return;
    const sent = await submit(counterpartyId, trimmed);
    if (sent) {
      setText('');
      setInputHeight(MIN_INPUT_HEIGHT);
    }
  }, [text, editing, editSubmitting, onSaveEdit, onCancelEdit, submitting, submit, counterpartyId]);

  const busy = editing ? editSubmitting : submitting;
  const canSend = text.trim().length > 0 && !busy;

  return (
    <View style={styles.container}>
      {editing ? (
        <View style={[styles.editBanner, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons name="create-outline" size={14} color={theme.textSecondary} />
          <Text variant="caption" color="textSecondary" style={styles.editBannerText}>
            Editing message
          </Text>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
            onPress={() => {
              setText('');
              setInputHeight(MIN_INPUT_HEIGHT);
              onCancelEdit?.();
            }}
            pressedScale={0.85}>
            <Ionicons name="close" size={16} color={theme.textSecondary} />
          </Touchable>
        </View>
      ) : null}

      {error && !editing ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {/* Attach sits on its own beside the field; the bordered pill holds the
          field and send. `alignItems: 'flex-end'` on both rows is what keeps
          the buttons pinned to the bottom edge as the field grows with the
          text instead of drifting to its vertical center. */}
      <View style={styles.bar}>
        <AttachButton onPress={onAttach} disabled={Boolean(editing)} />
        <View
          style={[
            styles.pill,
            {
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderColor: theme.glassBorder,
            },
          ]}>
          <View style={styles.textWrap}>
            <RNText
              style={[styles.input, styles.mirror]}
              onLayout={(e) => {
                const next = e.nativeEvent.layout.height;
                setInputHeight(Math.min(Math.max(next, MIN_INPUT_HEIGHT), MAX_INPUT_HEIGHT));
              }}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants">
              {mirrorText}
            </RNText>

            <TextInput
              value={text}
              onChangeText={(next) => setText(next.slice(0, MESSAGE_LIMIT))}
              placeholder="Message"
              placeholderTextColor={theme.textMuted}
              // `#composer-textarea` in global.css hides the web scrollbar this
              // produces once content exceeds `MAX_INPUT_HEIGHT` — `scrollEnabled`
              // has no effect on web (react-native-web's TextInput doesn't read it
              // at all), only native.
              nativeID="composer-textarea"
              style={[styles.input, { color: theme.text, height: inputHeight }]}
              multiline
              scrollEnabled={inputHeight >= MAX_INPUT_HEIGHT}
              returnKeyType="default"
            />
          </View>

          <SendButton editing={Boolean(editing)} enabled={canSend} onPress={send} />
        </View>
      </View>
    </View>
  );
}

/**
 * The attach entry point, standing on its own beside the field: a polished
 * metal disc (white through silver to graphite) with a glint of light that
 * sweeps across it every few seconds, so it reads as the place where the
 * good stuff — tickets, drinks — comes from. Pressing it spins the plus
 * into an × and pops it, then springs back.
 */
function AttachButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const theme = useTheme();
  const [spin] = useState(() => new Animated.Value(0));
  const [shine] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (disabled) return;
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        Animated.timing(shine, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shine, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    sweep.start();
    return () => sweep.stop();
  }, [disabled, shine]);

  const turn = (toValue: number) =>
    Animated.spring(spin, {
      toValue,
      useNativeDriver: true,
      speed: 22,
      bounciness: 12,
    }).start();

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '135deg'],
  });
  const iconScale = spin.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.25, 1.1],
  });
  const glintX = shine.interpolate({
    inputRange: [0, 1],
    outputRange: [-ATTACH_SIZE, ATTACH_SIZE],
  });

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel="Send a ticket, drink, or other item"
      onPress={onPress}
      onPressIn={() => turn(1)}
      onPressOut={() => turn(0)}
      disabled={disabled}
      haptic
      pressedScale={0.9}
      style={[styles.attachShadow, { opacity: disabled ? 0.35 : 1 }]}>
      <LinearGradient
        colors={['#FFFFFF', '#E4E4E7', '#A1A1AA', '#52525B']}
        locations={[0, 0.35, 0.75, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.attachDisc}>
        {/* A thin bright rim on the top edge — the "lit from above" bevel. */}
        <View pointerEvents="none" style={styles.attachRim} />
        <Animated.View
          pointerEvents="none"
          style={[styles.glint, { transform: [{ translateX: glintX }, { rotate: '20deg' }] }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View style={{ transform: [{ rotate }, { scale: iconScale }] }}>
          <PlusIcon size={22} weight="bold" color={theme.onBrand} />
        </Animated.View>
      </LinearGradient>
    </Touchable>
  );
}

/**
 * Solid white disc with a paper plane — springs up to full size once
 * there's something to send, and sits shrunk and dimmed until then.
 */
function SendButton({
  editing,
  enabled,
  onPress,
}: {
  editing: boolean;
  enabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const [ready] = useState(() => new Animated.Value(enabled ? 1 : 0));

  useEffect(() => {
    Animated.spring(ready, {
      toValue: enabled ? 1 : 0,
      useNativeDriver: true,
      speed: 24,
      bounciness: 10,
    }).start();
  }, [enabled, ready]);

  const scale = ready.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });
  const opacity = ready.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={editing ? 'Save edit' : 'Send message'}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      haptic
      pressedScale={0.85}
      style={styles.actionButton}>
      <Animated.View
        style={[styles.sendDisc, { backgroundColor: theme.brand, opacity, transform: [{ scale }] }]}>
        {editing ? (
          <CheckIcon size={18} weight="bold" color={theme.onBrand} />
        ) : (
          // The tilted plane's visual mass sits up and right — nudged back so it reads centered.
          <PaperPlaneTiltIcon size={19} weight="fill" color={theme.onBrand} style={styles.planeIcon} />
        )}
      </Animated.View>
    </Touchable>
  );
}

/** One line to start; roughly 5 lines at this font/line height once grown, both plus the field's own vertical padding. */
const LINE_HEIGHT = 20;
const MAX_LINES = 5;
const MIN_INPUT_HEIGHT = LINE_HEIGHT + Spacing.sm * 2;
const MAX_INPUT_HEIGHT = LINE_HEIGHT * MAX_LINES + Spacing.sm * 2;
/** Matches the one-line pill's full height (field + its padding), so the two sit flush. */
const ATTACH_SIZE = MIN_INPUT_HEIGHT + Spacing.xs * 2;

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  error: { textAlign: 'center' },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  editBannerText: { flex: 1 },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  actionButton: {
    width: MIN_INPUT_HEIGHT,
    height: MIN_INPUT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  attachShadow: {
    borderRadius: Radius.pill,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  attachDisc: {
    width: ATTACH_SIZE,
    height: ATTACH_SIZE,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  attachRim: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  glint: { position: 'absolute', top: -8, bottom: -8, width: 14 },
  sendDisc: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  planeIcon: { marginLeft: -2, marginBottom: -1 },
  textWrap: { flex: 1, position: 'relative' },
  mirror: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    opacity: 0,
    zIndex: -1,
  },
  input: {
    fontSize: 15,
    lineHeight: LINE_HEIGHT,
    textAlignVertical: 'top',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    // Without this, focusing the underlying web <textarea> draws the
    // browser's default rectangular outline right through the pill's own
    // rounded border — zero width is what actually hides it (`outlineStyle`
    // only controls solid/dotted/dashed, not visibility). `boxShadow: 'none'`
    // on top because Safari draws its focus ring as a shadow, not an outline,
    // so `outlineWidth: 0` alone still leaves a ring there.
    outlineWidth: 0,
    boxShadow: 'none',
  },
});

export const MessageComposer = memo(MessageComposerImpl);
