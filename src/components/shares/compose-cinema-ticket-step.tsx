import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PickableItemRow } from '@/components/shares/pickable-item-row';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { formatTicketDate } from '@/lib/date';
import type { TransferableCinemaTicket } from '@/types/api';

const MESSAGE_LIMIT = 500;

export type ComposeCinemaTicketStepProps = {
  tickets: TransferableCinemaTicket[];
  loading: boolean;
  /** ticket _id -> selected. Always the full seat count — a cinema ticket never splits. */
  selected: Set<string>;
  onToggle: (ticketId: string) => void;
  message: string;
  onChangeMessage: (text: string) => void;
  onContinue: () => void;
};

/** Which cinema ticket to send — checkbox only: one ticket already covers every seat bought in one category, so there is nothing to split. */
function ComposeCinemaTicketStepImpl({
  tickets,
  loading,
  selected,
  onToggle,
  message,
  onChangeMessage,
  onContinue,
}: ComposeCinemaTicketStepProps) {
  const selectedCount = tickets.filter((t) => selected.has(t._id)).length;

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
      ) : tickets.length === 0 ? (
        <Text variant="small" color="textMuted" style={styles.empty}>
          Nothing here is available to send right now.
        </Text>
      ) : (
        <View style={styles.list}>
          {tickets.map((ticket) => (
            <PickableItemRow
              key={ticket._id}
              title={`${ticket.movieTitle} · ${ticket.ticketType}`}
              subtitle={
                [ticket.cinema?.name, formatTicketDate(ticket.showtimeStartsAt), `${ticket.quantity} seat${ticket.quantity > 1 ? 's' : ''}`]
                  .filter(Boolean)
                  .join(' · ')
              }
              selected={selected.has(ticket._id)}
              onToggle={() => onToggle(ticket._id)}
            />
          ))}
        </View>
      )}

      <Field
        label="Message (optional)"
        value={message}
        onChangeText={(text) => onChangeMessage(text.slice(0, MESSAGE_LIMIT))}
        placeholder="Enjoy the movie!"
        multiline
        numberOfLines={3}
        hint={`${message.length}/${MESSAGE_LIMIT}`}
      />

      <Button label="Continue" size="lg" disabled={selectedCount === 0} onPress={onContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  list: { gap: Spacing.sm },
  spinner: { marginVertical: Spacing.lg },
  empty: { textAlign: 'center', paddingVertical: Spacing.lg },
});

export const ComposeCinemaTicketStep = memo(ComposeCinemaTicketStepImpl);
