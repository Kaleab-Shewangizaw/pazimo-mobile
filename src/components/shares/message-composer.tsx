import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useState } from 'react';
import { StyleSheet, Text as RNText, TextInput, View } from 'react-native';

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

      {/* One bordered pill holds all three controls — `alignItems: 'flex-end'`
          is what keeps attach/send pinned to the bottom edge as the field
          grows with the text instead of drifting to its vertical center. */}
      <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: theme.glassBorder }]}>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Send a ticket, drink, or other item"
          onPress={onAttach}
          disabled={Boolean(editing)}
          pressedScale={0.88}
          style={[styles.iconButton, { opacity: editing ? 0.35 : 1 }]}>
          <Ionicons name="add-circle-outline" size={26} color={theme.textSecondary} />
        </Touchable>

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

        <Touchable
          accessibilityRole="button"
          accessibilityLabel={editing ? 'Save edit' : 'Send message'}
          disabled={!canSend}
          onPress={send}
          haptic
          pressedScale={0.88}
          style={[styles.iconButton, { opacity: canSend ? 1 : 0.35 }]}>
          <Ionicons
            name={editing ? 'checkmark-circle' : 'arrow-up-circle'}
            size={30}
            color={theme.brand}
          />
        </Touchable>
      </View>
    </View>
  );
}

/** One line to start; roughly 5 lines at this font/line height once grown, both plus the field's own vertical padding. */
const LINE_HEIGHT = 20;
const MAX_LINES = 5;
const MIN_INPUT_HEIGHT = LINE_HEIGHT + Spacing.sm * 2;
const MAX_INPUT_HEIGHT = LINE_HEIGHT * MAX_LINES + Spacing.sm * 2;

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
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    gap: 2,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
