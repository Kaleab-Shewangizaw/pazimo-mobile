import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { QuestionBlock } from '@/components/rsvp/question-block';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RsvpAnswer, RsvpQuestion } from '@/types/api';

/**
 * The backend stores whatever number is sent (`answers` is `Mixed`) — it has no
 * opinion on scale size, so these ranges are a UI default, not a verified
 * contract: a 5-star rating, a 5-point emoji scale, and the standard 0-10 NPS.
 */
const RATING_MAX = 5;
const NPS_MAX = 10;
const EMOJI_SCALE = ['😞', '🙁', '😐', '🙂', '😄'];

/** `rating` (stars), `emoji` (an emoji row), and `nps` (the standard 0-10 row) — one row-of-buttons layout, three faces. */
function ScaleQuestionImpl({
  question,
  value,
  onChange,
  error,
}: {
  question: RsvpQuestion;
  value: RsvpAnswer;
  onChange: (value: RsvpAnswer) => void;
  error?: string | null;
}) {
  const theme = useTheme();
  const numericValue = typeof value === 'number' ? value : null;

  if (question.type === 'rating') {
    return (
      <QuestionBlock question={question} error={error}>
        <View style={styles.starRow}>
          {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((star) => (
            <Touchable
              key={star}
              accessibilityRole="button"
              accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
              accessibilityState={{ selected: numericValue !== null && star <= numericValue }}
              onPress={() => onChange(star)}
              haptic
              pressedScale={0.9}>
              <Ionicons
                name={numericValue !== null && star <= numericValue ? 'star' : 'star-outline'}
                size={28}
                color={theme.brand}
              />
            </Touchable>
          ))}
        </View>
      </QuestionBlock>
    );
  }

  if (question.type === 'emoji') {
    return (
      <QuestionBlock question={question} error={error}>
        <View style={styles.emojiRow}>
          {EMOJI_SCALE.map((emoji, index) => {
            const scaleValue = index + 1;
            const selected = numericValue === scaleValue;
            return (
              <Touchable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${scaleValue} of ${EMOJI_SCALE.length}`}
                accessibilityState={{ selected }}
                onPress={() => onChange(scaleValue)}
                haptic
                pressedScale={0.9}
                style={[
                  styles.emojiButton,
                  { borderColor: selected ? theme.brand : theme.glassBorder },
                  selected ? { backgroundColor: theme.brandTint } : null,
                ]}>
                <Text style={styles.emoji}>{emoji}</Text>
              </Touchable>
            );
          })}
        </View>
      </QuestionBlock>
    );
  }

  // nps
  return (
    <QuestionBlock question={question} error={error}>
      <View style={styles.npsRow}>
        {Array.from({ length: NPS_MAX + 1 }, (_, i) => i).map((score) => {
          const selected = numericValue === score;
          return (
            <Touchable
              key={score}
              accessibilityRole="button"
              accessibilityLabel={`Score ${score}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(score)}
              pressedScale={0.9}
              style={[
                styles.npsPill,
                {
                  borderColor: selected ? theme.brand : theme.glassBorder,
                  backgroundColor: selected ? theme.brand : 'transparent',
                },
              ]}>
              <Text variant="small" style={{ color: selected ? theme.onBrand : theme.text }}>
                {score}
              </Text>
            </Touchable>
          );
        })}
      </View>
    </QuestionBlock>
  );
}

const styles = StyleSheet.create({
  starRow: { flexDirection: 'row', gap: Spacing.sm },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  npsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  npsPill: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const ScaleQuestion = memo(ScaleQuestionImpl);
