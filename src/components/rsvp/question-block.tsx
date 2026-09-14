import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { RsvpQuestion } from '@/types/api';

/** Label/error scaffolding shared by every non-text question control, matching `Field`'s own block layout. */
function QuestionBlockImpl({
  question,
  error,
  children,
}: {
  question: RsvpQuestion;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <View style={styles.block}>
      <Text variant="caption" color="textSecondary">
        {question.required ? `${question.label} *` : question.label}
      </Text>
      {children}
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ block: { gap: 6 } });

export const QuestionBlock = memo(QuestionBlockImpl);
