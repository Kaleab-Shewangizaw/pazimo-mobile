import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  type LayoutChangeEvent,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { ComposeStep } from '@/components/shares/compose-step';
import { ConfirmStep } from '@/components/shares/confirm-step';
import { RecipientStep } from '@/components/shares/recipient-step';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { generateIdempotencyKey } from '@/lib/idempotency';
import { useCreateShare } from '@/queries/ticket-shares';
import { useTransferableTickets } from '@/queries/tickets';
import type { ShareUser } from '@/types/api';

/**
 * Recipient, then ticket + quantity, then an explicit confirmation — three
 * sliding steps in one sheet. The transition mechanics (two parallel
 * `Animated.Value`s, per-step measured heights) are `checkout-sheet.tsx`'s;
 * see that file for why plain `Animated` is used instead of Reanimated here.
 */

const SLIDE = { duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1) } as const;
const TRAVEL = 0.28;
const STEP_TITLES = ['Send a ticket', 'Choose admissions', 'Review transfer'] as const;

export type ShareTicketSheetProps = {
  visible: boolean;
  onClose: () => void;
  /**
   * A share never spans events, so passing this scopes the ticket picker to
   * one — the entry point from an open ticket. Omit it (from a conversation,
   * where there's no "current" event) to show every transferable ticket.
   */
  eventId?: string;
  /** Preselected with 1 admission — the ticket the sheet was opened from, if any. */
  initialTicketId?: string;
  /**
   * Known up front — the entry point from an open conversation. Skips the
   * recipient-search step entirely and starts on the ticket picker.
   */
  initialRecipient?: ShareUser;
};

export function ShareTicketSheet({
  visible,
  onClose,
  eventId,
  initialTicketId,
  initialRecipient,
}: ShareTicketSheetProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { submit, submitting, error } = useCreateShare();
  const { tickets: allTransferable, isLoading: transferableLoading } = useTransferableTickets();

  const eventTickets = useMemo(
    () => (eventId ? allTransferable.filter((t) => t.eventId === eventId) : allTransferable),
    [allTransferable, eventId],
  );

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [recipient, setRecipient] = useState<ShareUser | null>(null);
  const [quantities, setQuantities] = useState<Map<string, number>>(() => new Map());
  const [message, setMessage] = useState('');
  const idempotencyKeyRef = useRef(generateIdempotencyKey());

  // The sheet stays mounted across opens, but what it was opened for can
  // change between them (a different ticket's pager page, a different
  // conversation) — so the default selection/recipient/step are resynced on
  // every open. Keyed on `initialRecipient`'s id, not the object itself: a
  // caller that can't cheaply memoise a fallback object (a brand-new
  // conversation with no cached recipient yet) must not reset an in-progress
  // compose just because it re-rendered.
  useEffect(() => {
    if (!visible) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- there is no prior render this could be computed in: what the sheet was opened for can change while it's closed, and only the next open should pick that up.
    setQuantities(initialTicketId ? new Map([[initialTicketId, 1]]) : new Map());
    setRecipient(initialRecipient ?? null);
    setStep(initialRecipient ? 1 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed on the id, see comment above.
  }, [visible, initialTicketId, initialRecipient?._id]);

  const [slide] = useState(() => new Animated.Value(0));
  const [grow] = useState(() => new Animated.Value(0));
  const [heights, setHeights] = useState<[number, number, number]>([0, 0, 0]);

  const measure = useCallback(
    (index: 0 | 1 | 2) => (e: LayoutChangeEvent) => {
      const next = e.nativeEvent.layout.height;
      setHeights((current) => {
        if (Math.abs(current[index] - next) < 1) return current;
        const updated = [...current] as [number, number, number];
        updated[index] = next;
        return updated;
      });
    },
    [],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: step, ...SLIDE, useNativeDriver: true }),
      Animated.timing(grow, { toValue: step, ...SLIDE, useNativeDriver: false }),
    ]).start();
  }, [step, slide, grow]);

  const reset = useCallback(() => {
    setStep(0);
    setRecipient(null);
    setQuantities(new Map());
    setMessage('');
    idempotencyKeyRef.current = generateIdempotencyKey();
    slide.setValue(0);
    grow.setValue(0);
  }, [slide, grow]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    onClose();
    setTimeout(reset, 260);
  }, [onClose, reset]);

  const changeQuantity = useCallback((ticketId: string, quantity: number) => {
    setQuantities((current) => {
      const next = new Map(current);
      if (quantity > 0) next.set(ticketId, quantity);
      else next.delete(ticketId);
      return next;
    });
  }, []);

  const onSelectRecipient = useCallback((person: ShareUser) => {
    setRecipient(person);
    setStep(1);
  }, []);

  const selections = useMemo(
    () =>
      [...quantities.entries()]
        .map(([ticketId, quantity]) => {
          const ticket = eventTickets.find((t) => t.ticketId === ticketId);
          return ticket ? { ticket, quantity } : null;
        })
        .filter((s): s is { ticket: (typeof eventTickets)[number]; quantity: number } => s !== null),
    [quantities, eventTickets],
  );

  const onSend = useCallback(async () => {
    if (!recipient || !selections.length) return;
    Keyboard.dismiss();
    const share = await submit({
      toUserId: recipient._id,
      items: selections.map(({ ticket, quantity }) => ({ ticketId: ticket.ticketId, quantity })),
      message: message.trim() || undefined,
      idempotencyKey: idempotencyKeyRef.current,
    });
    if (share) {
      idempotencyKeyRef.current = generateIdempotencyKey();
      close();
    }
  }, [recipient, selections, message, submit, close]);

  const recipientName = recipient
    ? [recipient.firstName, recipient.lastName].filter(Boolean).join(' ').trim() || 'Pazimo user'
    : '';

  const travel = width * TRAVEL;

  const stepStyle = (index: 0 | 1 | 2) => ({
    opacity: slide.interpolate({
      inputRange: [index - 0.6, index, index + 0.6],
      outputRange: [0, 1, 0],
      extrapolate: 'clamp' as const,
    }),
    transform: [
      {
        translateX: slide.interpolate({
          inputRange: [index - 1, index, index + 1],
          outputRange: [travel, 0, -travel],
          extrapolate: 'clamp' as const,
        }),
      },
    ],
  });

  const measured = heights.every((h) => h > 0);

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.header}>
        {step > 0 ? (
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => setStep(step === 2 ? 1 : 0)}
            pressedScale={0.9}
            style={[styles.headerButton, { backgroundColor: theme.surfaceMuted }]}>
            <Ionicons name="chevron-back" size={18} color={theme.text} />
          </Touchable>
        ) : null}
        <Text variant="title" numberOfLines={1} style={styles.headerTitle}>
          {step === 1 ? `To ${recipientName}` : STEP_TITLES[step]}
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

      <Animated.View
        style={[
          styles.stage,
          measured
            ? { height: grow.interpolate({ inputRange: [0, 1, 2], outputRange: heights }) }
            : null,
        ]}>
        <Animated.View
          style={[styles.step, stepStyle(0)]}
          onLayout={measure(0)}
          pointerEvents={step === 0 ? 'auto' : 'none'}
          accessibilityElementsHidden={step !== 0}
          importantForAccessibility={step === 0 ? 'auto' : 'no-hide-descendants'}>
          <RecipientStep onSelect={onSelectRecipient} />
        </Animated.View>

        <Animated.View
          style={[styles.step, stepStyle(1)]}
          onLayout={measure(1)}
          pointerEvents={step === 1 ? 'auto' : 'none'}
          accessibilityElementsHidden={step !== 1}
          importantForAccessibility={step === 1 ? 'auto' : 'no-hide-descendants'}>
          <ComposeStep
            tickets={eventTickets}
            loading={transferableLoading}
            quantities={quantities}
            onChangeQuantity={changeQuantity}
            message={message}
            onChangeMessage={setMessage}
            onContinue={() => setStep(2)}
          />
        </Animated.View>

        <Animated.View
          style={[styles.step, stepStyle(2)]}
          onLayout={measure(2)}
          pointerEvents={step === 2 ? 'auto' : 'none'}
          accessibilityElementsHidden={step !== 2}
          importantForAccessibility={step === 2 ? 'auto' : 'no-hide-descendants'}>
          <ConfirmStep
            recipientName={recipientName}
            recipientHandle={recipient?.username}
            selections={selections}
            message={message.trim()}
            submitting={submitting}
            error={error}
            onConfirm={onSend}
          />
        </Animated.View>
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
  stage: { overflow: 'hidden' },
  step: { position: 'absolute', left: 0, right: 0, top: 0 },
});
