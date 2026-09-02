import { memo } from 'react';

import { Field } from '@/components/ui/field';
import type { RsvpQuestion } from '@/types/api';

function labelFor(question: RsvpQuestion): string {
  return question.required ? `${question.label} *` : question.label;
}

function TextQuestionImpl({
  question,
  value,
  onChange,
  error,
}: {
  question: RsvpQuestion;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}) {
  const long = question.type === 'long_text';

  return (
    <Field
      label={labelFor(question)}
      value={value}
      onChangeText={onChange}
      error={error}
      multiline={long}
      numberOfLines={long ? 4 : undefined}
      textAlignVertical={long ? 'top' : undefined}
      autoCapitalize={question.type === 'email' ? 'none' : 'sentences'}
      keyboardType={
        question.type === 'email' ? 'email-address' : question.type === 'phone' ? 'phone-pad' : 'default'
      }
    />
  );
}

export const TextQuestion = memo(TextQuestionImpl);
