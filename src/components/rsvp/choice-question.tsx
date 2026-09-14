import { Ionicons } from '@expo/vector-icons';
import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { QuestionBlock } from '@/components/rsvp/question-block';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RsvpAnswer, RsvpQuestion } from '@/types/api';

/** `yes_no` carries no `options` on the model — the two labels are implied by the type. */
const YES_NO_OPTIONS = ['Yes', 'No'];

function optionsFor(question: RsvpQuestion): string[] {
  if (question.options?.length) return question.options;
  return question.type === 'yes_no' ? YES_NO_OPTIONS : [];
}

function OptionRow({
  label,
  selected,
  multi,
  onPress,
}: {
  label: string;
  selected: boolean;
  multi: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Touchable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      pressedScale={0.98}
      style={[
        styles.row,
        {
          borderColor: selected ? theme.brand : theme.glassBorder,
          backgroundColor: selected ? theme.brandTint : 'transparent',
        },
      ]}>
      <View
        style={[
          multi ? styles.checkbox : styles.radio,
          { borderColor: selected ? theme.brand : theme.textMuted },
          selected ? { backgroundColor: theme.brand } : null,
        ]}>
        {selected ? <Ionicons name="checkmark" size={12} color={theme.onBrand} /> : null}
      </View>
      <Text variant="body" style={styles.rowLabel}>
        {label}
      </Text>
    </Touchable>
  );
}

/** `single_choice`/`yes_no` (radio), `multi_choice` (checkboxes), and `dropdown` (same rows, opened in a sheet). */
function ChoiceQuestionImpl({
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const options = optionsFor(question);
  const multi = question.type === 'multi_choice';
  const selectedList = Array.isArray(value) ? value : value ? [String(value)] : [];

  const toggle = (option: string) => {
    if (multi) {
      onChange(
        selectedList.includes(option)
          ? selectedList.filter((item) => item !== option)
          : [...selectedList, option],
      );
      return;
    }
    onChange(option);
    if (question.type === 'dropdown') setDropdownOpen(false);
  };

  if (question.type === 'dropdown') {
    const picked = typeof value === 'string' ? value : null;
    return (
      <QuestionBlock question={question} error={error}>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={question.label}
          onPress={() => setDropdownOpen(true)}
          style={[
            styles.dropdownTrigger,
            { borderColor: error ? theme.danger : theme.glassBorder },
          ]}>
          <Text variant="body" color={picked ? 'text' : 'textMuted'}>
            {picked ?? 'Select an option'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
        </Touchable>
        <BottomSheet visible={dropdownOpen} onClose={() => setDropdownOpen(false)}>
          <Text variant="title" style={styles.sheetTitle}>
            {question.label}
          </Text>
          <View style={styles.optionList}>
            {options.map((option) => (
              <OptionRow
                key={option}
                label={option}
                selected={picked === option}
                multi={false}
                onPress={() => toggle(option)}
              />
            ))}
          </View>
        </BottomSheet>
      </QuestionBlock>
    );
  }

  return (
    <QuestionBlock question={question} error={error}>
      <View style={styles.optionList}>
        {options.map((option) => (
          <OptionRow
            key={option}
            label={option}
            selected={selectedList.includes(option)}
            multi={multi}
            onPress={() => toggle(option)}
          />
        ))}
      </View>
    </QuestionBlock>
  );
}

const styles = StyleSheet.create({
  optionList: { gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sheetTitle: { marginBottom: Spacing.md },
});

export const ChoiceQuestion = memo(ChoiceQuestionImpl);
