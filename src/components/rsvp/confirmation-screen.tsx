import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PazimoQr } from '@/components/ticket/pazimo-qr';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RsvpResponse } from '@/types/api';

const QR_SIZE = 220;

/**
 * Terminal state — there is no guest-side edit/cancel endpoint, so once this
 * renders there's nothing left to do but leave. `qrCodePayload` is only ever
 * populated for `type:"rsvp"` forms once the response is `approved`/`paid`; a
 * `pending` manual-approval response (or a `"review"`-type submission) has none.
 */
function ConfirmationScreenImpl({
  response,
  onDone,
}: {
  response: RsvpResponse;
  onDone: () => void;
}) {
  const theme = useTheme();
  const pending = response.status === 'pending';

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: theme.brandTint }]}>
        <Ionicons
          name={pending ? 'time-outline' : 'checkmark-circle'}
          size={32}
          color={theme.brand}
        />
      </View>
      <Text variant="heading" style={styles.centered}>
        {pending ? 'Pending review' : "You're in"}
      </Text>
      <Text variant="body" color="textSecondary" style={styles.centered}>
        {pending
          ? "The host reviews RSVPs manually — we'll let you know once yours is approved."
          : 'Your RSVP is confirmed.'}
      </Text>

      {response.qrCodePayload ? (
        <>
          <View style={styles.qrCard}>
            <PazimoQr value={response.qrCodePayload} size={QR_SIZE} />
          </View>
          <Text variant="caption" color="textMuted" style={styles.centered}>
            Show this code at the door.
          </Text>
        </>
      ) : null}

      <Button label="Done" onPress={onDone} size="lg" style={styles.done} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  centered: { textAlign: 'center' },
  qrCard: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
  },
  done: { width: '100%', marginTop: Spacing.lg },
});

export const ConfirmationScreen = memo(ConfirmationScreenImpl);
