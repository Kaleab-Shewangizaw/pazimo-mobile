import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PickableItemRow } from '@/components/shares/pickable-item-row';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { formatTicketDate } from '@/lib/date';
import type { TransferableTicket } from '@/types/api';

const MESSAGE_LIMIT = 500;

export type ComposeStepProps = {
  /** Already filtered to the event this share started from — a share never spans events. */
  tickets: TransferableTicket[];
  loading: boolean;
  /** ticketId -> quantity selected to send. A ticket absent (or 0) is not included. */
  quantities: Map<string, number>;
  onChangeQuantity: (ticketId: string, quantity: number) => void;
  message: string;
  onChangeMessage: (text: string) => void;
  onContinue: () => void;
};

/**
 * Which of this event's transferable tickets to send, and how many
 * admissions from each. Backend-authoritative: `transferableCapacity` is
 * exactly how many admissions are actually free to move right now, so that's
 * the only bound this step ever enforces — it never guesses at a ticket's
 * ownership or splits math itself.
 */
function ComposeStepImpl({
  tickets,
  loading,
  quantities,
  onChangeQuantity,
  message,
  onChangeMessage,
  onContinue,
}: ComposeStepProps) {
  // Counted against `tickets`, not the raw map — a preselected id that never
  // shows up here (already used, checked in, or dropped from the transferable
  // list since the sheet opened) must not silently enable "Continue".
  const selectedCount = tickets.filter((t) => (quantities.get(t.ticketId) ?? 0) > 0).length;

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
      ) : tickets.length === 0 ? (
        <Text variant="small" color="textMuted" style={styles.empty}>
          Nothing here is available to send right now.
        </Text>
      ) : (
        <View style={styles.ticketList}>
          {tickets.map((ticket) => (
            <TicketRow
              key={ticket.ticketId}
              ticket={ticket}
              quantity={quantities.get(ticket.ticketId) ?? 0}
              onChange={(q) => onChangeQuantity(ticket.ticketId, q)}
            />
          ))}
        </View>
      )}

      <Field
        label="Message (optional)"
        value={message}
        onChangeText={(text) => onChangeMessage(text.slice(0, MESSAGE_LIMIT))}
        placeholder="Enjoy the show!"
        multiline
        numberOfLines={3}
        hint={`${message.length}/${MESSAGE_LIMIT}`}
      />

      <Button label="Continue" size="lg" disabled={selectedCount === 0} onPress={onContinue} />
    </View>
  );
}

function TicketRow({
  ticket,
  quantity,
  onChange,
}: {
  ticket: TransferableTicket;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  const selected = quantity > 0;
  const singleAdmission = ticket.transferableCapacity <= 1;
  const full = quantity === ticket.transferableCapacity;

  return (
    <PickableItemRow
      title={`${ticket.eventName} · ${ticket.ticketType}`}
      subtitle={
        formatTicketDate(ticket.eventDate) +
        (ticket.transferableCapacity > 1 ? ` · ${ticket.transferableCapacity} admissions available` : '')
      }
      selected={selected}
      onToggle={() => onChange(selected ? 0 : 1)}
      stepper={
        singleAdmission
          ? undefined
          : {
              value: quantity,
              min: 1,
              max: ticket.transferableCapacity,
              onChange,
              hint: full
                ? "You'll no longer have this ticket."
                : `You'll keep ${ticket.transferableCapacity - quantity}, send ${quantity}.`,
            }
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  ticketList: { gap: Spacing.sm },
  spinner: { marginVertical: Spacing.lg },
  empty: { textAlign: 'center', paddingVertical: Spacing.lg },
});

export const ComposeStep = memo(ComposeStepImpl);
