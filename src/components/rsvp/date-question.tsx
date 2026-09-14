import { Ionicons } from '@expo/vector-icons';
// eslint-disable-next-line import/no-named-as-default -- the package's default export *is* the picker component.
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { memo, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { QuestionBlock } from '@/components/rsvp/question-block';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RsvpAnswer, RsvpQuestion } from '@/types/api';

const displayFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function toDate(value: RsvpAnswer): Date {
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Stored as `YYYY-MM-DD` — the server just persists whatever is sent
 * (`answers` is a `Mixed` map), so this is the simplest unambiguous wire
 * format rather than a confirmed contract.
 */
function toAnswer(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * `@expo/ui`'s drop-in replacement for `@react-native-community/datetimepicker`
 * (already a dependency, no new package needed) — it renders inline on iOS
 * unconditionally, so the trigger row below just toggles whether the picker is
 * mounted at all rather than opening a native dialog on both platforms.
 */
function DateQuestionImpl({
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
  const [open, setOpen] = useState(false);
  const picked = typeof value === 'string' && value ? value : null;

  return (
    <QuestionBlock question={question} error={error}>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={question.label}
        onPress={() => setOpen((current) => !current)}
        style={[styles.trigger, { borderColor: error ? theme.danger : theme.glassBorder }]}>
        <Text variant="body" color={picked ? 'text' : 'textMuted'}>
          {picked ? displayFormat.format(toDate(picked)) : 'Select a date'}
        </Text>
        <Ionicons name="calendar-outline" size={16} color={theme.textMuted} />
      </Touchable>
      {open ? (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          presentation={Platform.OS === 'android' ? 'dialog' : undefined}
          onDismiss={() => setOpen(false)}
          onValueChange={(_event, selected) => {
            if (Platform.OS === 'android') setOpen(false);
            if (selected) onChange(toAnswer(selected));
          }}
        />
      ) : null}
    </QuestionBlock>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});

export const DateQuestion = memo(DateQuestionImpl);
