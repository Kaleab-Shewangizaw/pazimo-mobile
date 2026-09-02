import { memo } from 'react';

import { ChoiceQuestion } from '@/components/rsvp/choice-question';
import { DateQuestion } from '@/components/rsvp/date-question';
import { QuestionBlock } from '@/components/rsvp/question-block';
import { ScaleQuestion } from '@/components/rsvp/scale-question';
import { TextQuestion } from '@/components/rsvp/text-question';
import { Text } from '@/components/ui/text';
import type { RsvpAnswer, RsvpQuestion } from '@/types/api';

export type QuestionInputProps = {
  question: RsvpQuestion;
  value: RsvpAnswer;
  onChange: (value: RsvpAnswer) => void;
  error?: string | null;
};

const TEXT_TYPES = new Set(['short_text', 'long_text', 'email', 'phone']);
const CHOICE_TYPES = new Set(['single_choice', 'multi_choice', 'dropdown', 'yes_no']);
const SCALE_TYPES = new Set(['rating', 'nps', 'emoji']);

/** Dispatches a question to its type-family control — the one place that has to know all 13 `RsvpQuestionType`s. */
function QuestionInputImpl({ question, value, onChange, error }: QuestionInputProps) {
  if (TEXT_TYPES.has(question.type)) {
    return (
      <TextQuestion
        question={question}
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
        error={error}
      />
    );
  }
  if (CHOICE_TYPES.has(question.type)) {
    return <ChoiceQuestion question={question} value={value} onChange={onChange} error={error} />;
  }
  if (SCALE_TYPES.has(question.type)) {
    return <ScaleQuestion question={question} value={value} onChange={onChange} error={error} />;
  }
  if (question.type === 'date') {
    return <DateQuestion question={question} value={value} onChange={onChange} error={error} />;
  }

  // `file` — deferred (see the plan: no upload dependency or confirmed wire contract yet).
  return (
    <QuestionBlock question={question} error={error}>
      <Text variant="caption" color="textMuted">
        File upload isn&apos;t supported in the app yet — sorry about that.
      </Text>
    </QuestionBlock>
  );
}

export const QuestionInput = memo(QuestionInputImpl);
