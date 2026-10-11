import { memo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ShareKind } from '@/lib/share-item-view-model';

const MESSAGE_LIMIT = 500;

type TransferKind = Exclude<ShareKind, 'MESSAGE'>;

const NOUN: Record<TransferKind, [singular: string, plural: string]> = {
  TICKET: ['ticket', 'tickets'],
  BEVERAGE: ['drink', 'drinks'],
  CINEMA_TICKET: ['cinema ticket', 'cinema tickets'],
  CINEMA_CONCESSION: ['snack', 'snacks'],
};

/** One tap fills the note — the first doubles as the field's placeholder. */
const SUGGESTIONS: Record<TransferKind, string[]> = {
  TICKET: ['Enjoy the show!', 'See you there 🎉', 'My treat 😉', 'Happy birthday! 🎂'],
  BEVERAGE: ['Cheers!', 'This one’s on me 🥂', 'Enjoy! 🍹', 'Thanks for everything'],
  CINEMA_TICKET: ['Enjoy the movie!', 'Save me a seat 🍿', 'My treat 😉', 'Happy birthday! 🎂'],
  CINEMA_CONCESSION: ['Enjoy!', 'Snacks on me 🍿', 'Don’t share them 😄', 'Thanks!'],
};

export type MessageStepProps = {
  recipientName: string;
  kind: ShareKind;
  itemCount: number;
  message: string;
  onChangeMessage: (text: string) => void;
};

/**
 * Its own step between picking items and reviewing the transfer, so the
 * note is front and centre instead of sitting under a long item list.
 * Optional — the sheet's pinned button reads "Skip" until something's typed.
 */
function MessageStepImpl({ recipientName, kind, itemCount, message, onChangeMessage }: MessageStepProps) {
  const theme = useTheme();
  const transferKind: TransferKind = kind === 'MESSAGE' ? 'TICKET' : kind;
  const [singular, plural] = NOUN[transferKind];
  const suggestions = SUGGESTIONS[transferKind];

  return (
    <View style={styles.container}>
      <Text variant="body" color="textSecondary">
        Sending {itemCount} {itemCount === 1 ? singular : plural} to {recipientName}. Want to add a note?
      </Text>

      <View style={[styles.box, { borderColor: theme.glassBorder }]}>
        <TextInput
          value={message}
          onChangeText={(text) => onChangeMessage(text.slice(0, MESSAGE_LIMIT))}
          placeholder={suggestions[0]}
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.brand}
          style={[styles.input, { color: theme.text }]}
          multiline
          autoFocus
          textAlignVertical="top"
        />
        <Text variant="caption" color="textMuted" style={styles.counter}>
          {message.length}/{MESSAGE_LIMIT}
        </Text>
      </View>

      <View style={styles.suggestions}>
        {suggestions.map((suggestion) => {
          const active = message === suggestion;
          return (
            <Touchable
              key={suggestion}
              accessibilityRole="button"
              accessibilityLabel={`Use "${suggestion}"`}
              onPress={() => onChangeMessage(active ? '' : suggestion)}
              haptic
              pressedScale={0.94}
              style={[
                styles.suggestion,
                active
                  ? { backgroundColor: theme.brand, borderColor: theme.brand }
                  : { backgroundColor: theme.surfaceMuted, borderColor: theme.glassBorder },
              ]}>
              <Text variant="small" style={{ color: active ? theme.onBrand : theme.text }}>
                {suggestion}
              </Text>
            </Touchable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  box: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  input: {
    minHeight: 110,
    fontSize: FontSize.body,
    fontFamily: FontFamily.medium,
    // See `message-composer.tsx` — hides the web textarea's focus ring.
    outlineWidth: 0,
  },
  counter: { alignSelf: 'flex-end' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  suggestion: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export const MessageStep = memo(MessageStepImpl);
