import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * One line of the review — already fully composed by the caller (the title,
 * and the "you'll no longer own this" / "sending N of M, you'll keep the
 * rest" subtitle), so this step never needs to know which kind produced it.
 */
export type ConfirmSelection = {
  id: string;
  title: string;
  subtitle: string;
  /** Whether the sender loses this item entirely. Every kind but a partial ticket transfer is always full. */
  full: boolean;
};

export type ConfirmStepProps = {
  recipientName: string;
  recipientHandle?: string;
  selections: ConfirmSelection[];
  message: string;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
};

/**
 * The one screen where the permanence of a transfer actually gets said out
 * loud, per-item — a full transfer reads "you'll no longer own this", a
 * partial one reads what's kept vs sent, and neither gets softened into
 * vaguer copy. Nothing here is submitted until `onConfirm`.
 */
function ConfirmStepImpl({
  recipientName,
  recipientHandle,
  selections,
  message,
  submitting,
  error,
  onConfirm,
}: ConfirmStepProps) {
  const theme = useTheme();

  const allFull = useMemo(() => selections.every((s) => s.full), [selections]);

  return (
    <View style={styles.container}>
      <Text variant="title">Confirm transfer</Text>

      <View style={styles.list}>
        {selections.map((selection) => (
          <View key={selection.id} style={[styles.row, { borderColor: theme.hairline }]}>
            <Text variant="body" numberOfLines={1}>
              {selection.title}
            </Text>
            <Text variant="caption" color="textSecondary">
              {selection.subtitle}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.toRow}>
        <Text variant="small" color="textSecondary">
          To
        </Text>
        <Text variant="body">
          {recipientName}
          {recipientHandle ? ` · @${recipientHandle}` : ''}
        </Text>
      </View>

      {message ? (
        <View style={[styles.messageBox, { backgroundColor: theme.surfaceMuted }]}>
          <Text variant="body">{message}</Text>
        </View>
      ) : null}

      <Text variant="caption" color="textMuted" style={styles.warning}>
        {allFull
          ? 'This transfer cannot be undone.'
          : 'What you send cannot be taken back. What you keep stays yours.'}
      </Text>

      {error ? (
        <Text variant="small" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button
        label="Transfer"
        size="lg"
        loading={submitting}
        disabled={submitting || selections.length === 0}
        onPress={onConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  list: { gap: Spacing.sm },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
  },
  toRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  messageBox: { borderRadius: Radius.md, padding: Spacing.md },
  warning: { textAlign: 'center' },
  error: { textAlign: 'center' },
});

export const ConfirmStep = memo(ConfirmStepImpl);
