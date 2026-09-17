import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Keyboard, StyleSheet, View } from 'react-native';

import { ComposeBeverageStep } from '@/components/shares/compose-beverage-step';
import { ComposeCinemaConcessionStep } from '@/components/shares/compose-cinema-concession-step';
import { ComposeCinemaTicketStep } from '@/components/shares/compose-cinema-ticket-step';
import { ComposeStep } from '@/components/shares/compose-step';
import { ConfirmStep, type ConfirmSelection } from '@/components/shares/confirm-step';
import { KindPickerStep } from '@/components/shares/kind-picker-step';
import { RecipientStep } from '@/components/shares/recipient-step';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { generateIdempotencyKey } from '@/lib/idempotency';
import { formatTicketDate } from '@/lib/date';
import { formatPrice } from '@/lib/pricing';
import type { ShareKind } from '@/lib/share-item-view-model';
import { useCreateBeverageShare, useTransferableBeverageSales } from '@/queries/beverage-shares';
import {
  useCreateCinemaShare,
  useTransferableCinemaConcessions,
  useTransferableCinemaTickets,
} from '@/queries/cinema-shares';
import { useCreateShare } from '@/queries/ticket-shares';
import { useTransferableTickets } from '@/queries/tickets';
import type { ShareUser } from '@/types/api';

/**
 * The one compose sheet for every "send this to a friend" entry point in the
 * app. Recipient, then (unless fixed by the caller) what kind of thing to
 * send, then the kind-specific item picker, then an explicit confirmation.
 *
 * Each step is skippable when the caller already knows the answer:
 * `initialRecipient` (opened from an open conversation) skips the recipient
 * step, `forcedKind` (opened from a ticket/order screen that already knows
 * what it's offering) skips the kind picker.
 */

type StepKey = 'recipient' | 'kind' | 'item' | 'confirm';

const STEP_TITLE: Record<StepKey, string> = {
  recipient: 'Send to a friend',
  kind: 'What do you want to send?',
  item: 'Choose what to send',
  confirm: 'Review transfer',
};

export type ShareItemSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Fixes what's being sent and skips the kind-picker step — the ticket/refill order entry points. */
  forcedKind?: ShareKind;
  /** Narrows the kind picker when not forced. Ignored when `forcedKind` is set. */
  allowedKinds?: ShareKind[];
  /** A ticket share never spans events — scopes the ticket picker to one. Ticket kind only. */
  eventId?: string;
  /** Preselected with 1 admission. Ticket kind only. */
  initialTicketId?: string;
  /** Known up front — skips the recipient-search step entirely. */
  initialRecipient?: ShareUser;
};

export function ShareItemSheet({
  visible,
  onClose,
  forcedKind,
  allowedKinds,
  eventId,
  initialTicketId,
  initialRecipient,
}: ShareItemSheetProps) {
  const theme = useTheme();

  const ticketShare = useCreateShare();
  const beverageShare = useCreateBeverageShare();
  const cinemaShare = useCreateCinemaShare();

  const { tickets: allTransferableTickets, isLoading: ticketsLoading } = useTransferableTickets();
  const { sales: allTransferableSales, isLoading: salesLoading } = useTransferableBeverageSales();
  const { tickets: allCinemaTickets, isLoading: cinemaTicketsLoading } = useTransferableCinemaTickets();
  const { concessions: allCinemaConcessions, isLoading: cinemaConcessionsLoading } =
    useTransferableCinemaConcessions();

  const eventTickets = useMemo(
    () => (eventId ? allTransferableTickets.filter((t) => t.eventId === eventId) : allTransferableTickets),
    [allTransferableTickets, eventId],
  );

  const activeSteps = useMemo<StepKey[]>(() => {
    const steps: StepKey[] = [];
    if (!initialRecipient) steps.push('recipient');
    if (!forcedKind) steps.push('kind');
    steps.push('item');
    steps.push('confirm');
    return steps;
  }, [initialRecipient, forcedKind]);

  const [stepIndex, setStepIndex] = useState(0);
  const [recipient, setRecipient] = useState<ShareUser | null>(null);
  const [selectedKind, setSelectedKind] = useState<ShareKind | null>(forcedKind ?? null);
  const [ticketQuantities, setTicketQuantities] = useState<Map<string, number>>(() => new Map());
  const [beverageSelected, setBeverageSelected] = useState<Set<string>>(() => new Set());
  const [cinemaTicketSelected, setCinemaTicketSelected] = useState<Set<string>>(() => new Set());
  const [cinemaConcessionSelected, setCinemaConcessionSelected] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState('');
  const idempotencyKeyRef = useRef(generateIdempotencyKey());

  // Resynced on every open — what the sheet was opened for can change
  // between opens (a different ticket, a different conversation, a
  // different forced kind), so nothing carries over from a prior open.
  useEffect(() => {
    if (!visible) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- there is no prior render this could be computed in: what the sheet was opened for can change while it's closed.
    setTicketQuantities(initialTicketId ? new Map([[initialTicketId, 1]]) : new Map());
    setBeverageSelected(new Set());
    setCinemaTicketSelected(new Set());
    setCinemaConcessionSelected(new Set());
    setRecipient(initialRecipient ?? null);
    setSelectedKind(forcedKind ?? null);
    setStepIndex(0);
    setMessage('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed on ids, not object identity.
  }, [visible, initialTicketId, initialRecipient?._id, forcedKind]);

  const [fade] = useState(() => new Animated.Value(1));
  const step = activeSteps[stepIndex] ?? 'confirm';

  const goToStep = useCallback(
    (nextIndex: number) => {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
      setStepIndex(nextIndex);
    },
    [fade],
  );

  const reset = useCallback(() => {
    setStepIndex(0);
    setRecipient(null);
    setSelectedKind(forcedKind ?? null);
    setTicketQuantities(new Map());
    setBeverageSelected(new Set());
    setCinemaTicketSelected(new Set());
    setCinemaConcessionSelected(new Set());
    setMessage('');
    idempotencyKeyRef.current = generateIdempotencyKey();
    fade.setValue(1);
  }, [fade, forcedKind]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    onClose();
    setTimeout(reset, 260);
  }, [onClose, reset]);

  const back = useCallback(() => {
    if (stepIndex === 0) return;
    goToStep(stepIndex - 1);
  }, [stepIndex, goToStep]);

  const onSelectRecipient = useCallback(
    (person: ShareUser) => {
      setRecipient(person);
      goToStep(stepIndex + 1);
    },
    [stepIndex, goToStep],
  );

  const onSelectKind = useCallback(
    (kind: ShareKind) => {
      setSelectedKind(kind);
      goToStep(stepIndex + 1);
    },
    [stepIndex, goToStep],
  );

  const changeTicketQuantity = useCallback((ticketId: string, quantity: number) => {
    setTicketQuantities((current) => {
      const next = new Map(current);
      if (quantity > 0) next.set(ticketId, quantity);
      else next.delete(ticketId);
      return next;
    });
  }, []);

  const toggleBeverage = useCallback((saleId: string) => {
    setBeverageSelected((current) => {
      const next = new Set(current);
      if (next.has(saleId)) next.delete(saleId);
      else next.add(saleId);
      return next;
    });
  }, []);

  const toggleCinemaTicket = useCallback((ticketId: string) => {
    setCinemaTicketSelected((current) => {
      const next = new Set(current);
      if (next.has(ticketId)) next.delete(ticketId);
      else next.add(ticketId);
      return next;
    });
  }, []);

  const toggleCinemaConcession = useCallback((saleId: string) => {
    setCinemaConcessionSelected((current) => {
      const next = new Set(current);
      if (next.has(saleId)) next.delete(saleId);
      else next.add(saleId);
      return next;
    });
  }, []);

  const ticketSelections = useMemo(
    () =>
      [...ticketQuantities.entries()]
        .map(([ticketId, quantity]) => {
          const ticket = eventTickets.find((t) => t.ticketId === ticketId);
          return ticket ? { ticket, quantity } : null;
        })
        .filter((s): s is { ticket: (typeof eventTickets)[number]; quantity: number } => s !== null),
    [ticketQuantities, eventTickets],
  );

  const beverageSelections = useMemo(
    () => allTransferableSales.filter((s) => beverageSelected.has(s.saleId)),
    [allTransferableSales, beverageSelected],
  );

  const cinemaTicketSelections = useMemo(
    () => allCinemaTickets.filter((t) => cinemaTicketSelected.has(t._id)),
    [allCinemaTickets, cinemaTicketSelected],
  );

  const cinemaConcessionSelections = useMemo(
    () => allCinemaConcessions.filter((c) => cinemaConcessionSelected.has(c._id)),
    [allCinemaConcessions, cinemaConcessionSelected],
  );

  const confirmSelections: ConfirmSelection[] = useMemo(() => {
    if (selectedKind === 'BEVERAGE') {
      return beverageSelections.map((sale) => ({
        id: sale.saleId,
        title: sale.beverageName,
        subtitle: `${sale.title} · ${formatPrice(sale.totalAmount, sale.currency)} — you'll no longer have this`,
        full: true,
      }));
    }
    if (selectedKind === 'CINEMA_TICKET') {
      return cinemaTicketSelections.map((ticket) => ({
        id: ticket._id,
        title: `${ticket.movieTitle} · ${ticket.ticketType}`,
        subtitle: `${formatTicketDate(ticket.showtimeStartsAt)} — you'll no longer have this`,
        full: true,
      }));
    }
    if (selectedKind === 'CINEMA_CONCESSION') {
      return cinemaConcessionSelections.map((sale) => ({
        id: sale._id,
        title: sale.beverageName,
        subtitle: `${formatPrice(sale.totalAmount, sale.currency)} — you'll no longer have this`,
        full: true,
      }));
    }
    return ticketSelections.map(({ ticket, quantity }) => {
      const full = quantity === ticket.transferableCapacity;
      return {
        id: ticket.ticketId,
        title: `${ticket.eventName} · ${ticket.ticketType}`,
        subtitle: full
          ? quantity > 1
            ? `All ${quantity} admissions — you'll no longer own this ticket`
            : "You'll no longer own this ticket"
          : `Sending ${quantity} of ${ticket.transferableCapacity} — you'll keep ${ticket.transferableCapacity - quantity}`,
        full,
      };
    });
  }, [selectedKind, beverageSelections, cinemaTicketSelections, cinemaConcessionSelections, ticketSelections]);

  const activeShare =
    selectedKind === 'BEVERAGE'
      ? beverageShare
      : selectedKind === 'CINEMA_TICKET' || selectedKind === 'CINEMA_CONCESSION'
        ? cinemaShare
        : ticketShare;

  const onSend = useCallback(async () => {
    if (!recipient) return;
    Keyboard.dismiss();

    let result;
    if (selectedKind === 'BEVERAGE') {
      result = beverageSelections.length
        ? await beverageShare.submit({
            toUserId: recipient._id,
            salesContext: beverageSelections[0].salesContext,
            items: beverageSelections.map((sale) => ({ saleId: sale.saleId, quantity: sale.quantity })),
            message: message.trim() || undefined,
            idempotencyKey: idempotencyKeyRef.current,
          })
        : null;
    } else if (selectedKind === 'CINEMA_TICKET') {
      result = cinemaTicketSelections.length
        ? await cinemaShare.submit({
            toUserId: recipient._id,
            itemType: 'CINEMA_TICKET',
            items: cinemaTicketSelections.map((ticket) => ({ itemId: ticket._id, quantity: ticket.quantity })),
            message: message.trim() || undefined,
            idempotencyKey: idempotencyKeyRef.current,
          })
        : null;
    } else if (selectedKind === 'CINEMA_CONCESSION') {
      result = cinemaConcessionSelections.length
        ? await cinemaShare.submit({
            toUserId: recipient._id,
            itemType: 'CINEMA_CONCESSION',
            items: cinemaConcessionSelections.map((sale) => ({ itemId: sale._id, quantity: sale.quantity })),
            message: message.trim() || undefined,
            idempotencyKey: idempotencyKeyRef.current,
          })
        : null;
    } else {
      result = ticketSelections.length
        ? await ticketShare.submit({
            toUserId: recipient._id,
            items: ticketSelections.map(({ ticket, quantity }) => ({ ticketId: ticket.ticketId, quantity })),
            message: message.trim() || undefined,
            idempotencyKey: idempotencyKeyRef.current,
          })
        : null;
    }

    if (result) {
      idempotencyKeyRef.current = generateIdempotencyKey();
      close();
    }
  }, [
    recipient,
    selectedKind,
    beverageSelections,
    cinemaTicketSelections,
    cinemaConcessionSelections,
    ticketSelections,
    message,
    beverageShare,
    cinemaShare,
    ticketShare,
    close,
  ]);

  const recipientName = recipient
    ? [recipient.firstName, recipient.lastName].filter(Boolean).join(' ').trim() || 'Pazimo user'
    : '';

  const headerTitle = step !== 'recipient' && recipient ? `To ${recipientName}` : STEP_TITLE[step];

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.header}>
        {stepIndex > 0 ? (
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={back}
            pressedScale={0.9}
            style={[styles.headerButton, { backgroundColor: theme.surfaceMuted }]}>
            <Ionicons name="chevron-back" size={18} color={theme.text} />
          </Touchable>
        ) : null}
        <Text variant="title" numberOfLines={1} style={styles.headerTitle}>
          {headerTitle}
        </Text>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={close}
          pressedScale={0.9}
          style={[styles.headerButton, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons name="close" size={18} color={theme.text} />
        </Touchable>
      </View>

      <Animated.View style={{ opacity: fade }}>
        {step === 'recipient' ? (
          <RecipientStep onSelect={onSelectRecipient} />
        ) : step === 'kind' ? (
          <KindPickerStep allowedKinds={allowedKinds} onSelect={onSelectKind} />
        ) : step === 'item' ? (
          selectedKind === 'BEVERAGE' ? (
            <ComposeBeverageStep
              sales={allTransferableSales}
              loading={salesLoading}
              selected={beverageSelected}
              onToggle={toggleBeverage}
              message={message}
              onChangeMessage={setMessage}
              onContinue={() => goToStep(stepIndex + 1)}
            />
          ) : selectedKind === 'CINEMA_TICKET' ? (
            <ComposeCinemaTicketStep
              tickets={allCinemaTickets}
              loading={cinemaTicketsLoading}
              selected={cinemaTicketSelected}
              onToggle={toggleCinemaTicket}
              message={message}
              onChangeMessage={setMessage}
              onContinue={() => goToStep(stepIndex + 1)}
            />
          ) : selectedKind === 'CINEMA_CONCESSION' ? (
            <ComposeCinemaConcessionStep
              concessions={allCinemaConcessions}
              loading={cinemaConcessionsLoading}
              selected={cinemaConcessionSelected}
              onToggle={toggleCinemaConcession}
              message={message}
              onChangeMessage={setMessage}
              onContinue={() => goToStep(stepIndex + 1)}
            />
          ) : (
            <ComposeStep
              tickets={eventTickets}
              loading={ticketsLoading}
              quantities={ticketQuantities}
              onChangeQuantity={changeTicketQuantity}
              message={message}
              onChangeMessage={setMessage}
              onContinue={() => goToStep(stepIndex + 1)}
            />
          )
        ) : (
          <ConfirmStep
            recipientName={recipientName}
            recipientHandle={recipient?.username}
            selections={confirmSelections}
            message={message.trim()}
            submitting={activeShare.submitting}
            error={activeShare.error}
            onConfirm={onSend}
          />
        )}
      </Animated.View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerTitle: { flex: 1 },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
