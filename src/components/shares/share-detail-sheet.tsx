import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AvatarInitials } from '@/components/shares/avatar-initials';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRespondToShareItem } from '@/hooks/use-respond-to-share-item';
import { formatShortDate } from '@/lib/date';
import type { ShareItemViewModel } from '@/lib/share-item-view-model';
import { useAuthStore } from '@/stores/use-auth-store';
import type { ShareStatus } from '@/types/api';

const STATUS_LABEL: Record<ShareStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export type ShareDetailSheetProps = {
  /**
   * Kept non-null while the sheet is closing (only `visible` flips) so the
   * content doesn't blank out mid dismiss-animation — same reasoning as the
   * `reset()` timing in `checkout-sheet.tsx`.
   */
  share: ShareItemViewModel | null;
  visible: boolean;
  onClose: () => void;
};

function ShareDetailSheetImpl({ share, visible, onClose }: ShareDetailSheetProps) {
  const theme = useTheme();
  const myId = useAuthStore((s) => s.user?._id);
  const { accept, decline, cancel, submitting, pendingAction, error } = useRespondToShareItem(
    share?.kind ?? 'TICKET',
  );

  const sent = share ? share.fromUser._id === myId : false;
  const otherUser = share ? (sent ? share.toUser : share.fromUser) : null;
  const otherName = otherUser
    ? [otherUser.firstName, otherUser.lastName].filter(Boolean).join(' ').trim() ||
      (otherUser.username ? `@${otherUser.username}` : 'Pazimo user')
    : '';

  const respond = useCallback(
    async (action: 'accept' | 'decline' | 'cancel') => {
      if (!share) return;
      const result =
        action === 'accept' ? await accept(share.id) : action === 'decline' ? await decline(share.id) : await cancel(share.id);
      if (result) onClose();
    },
    [share, accept, decline, cancel, onClose],
  );

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {share ? (
        <View style={styles.container}>
          <View style={styles.header}>
            <AvatarInitials name={otherName} size={48} />
            <View style={styles.headerText}>
              <Text variant="title" numberOfLines={1}>
                {otherName}
              </Text>
              <Text variant="small" color="textSecondary">
                {sent ? 'You sent this' : 'Sent to you'} · {STATUS_LABEL[share.status]}
              </Text>
            </View>
          </View>

          <View style={styles.itemList}>
            {share.lines.map((line) => (
              <View key={line.id} style={[styles.itemRow, { borderColor: theme.hairline }]}>
                <Text variant="body" numberOfLines={1}>
                  {line.title}
                </Text>
                <Text variant="caption" color="textSecondary">
                  {line.subtitle}
                </Text>
              </View>
            ))}
          </View>

          {share.message ? (
            <View style={[styles.messageBox, { backgroundColor: theme.surfaceMuted }]}>
              <Text variant="body">{share.message}</Text>
            </View>
          ) : null}

          {share.status === 'pending' ? (
            <Text variant="caption" color="textMuted">
              Expires {formatShortDate(share.expiresAt)}
            </Text>
          ) : null}

          {error ? (
            <Text variant="small" color="danger" style={styles.error}>
              {error}
            </Text>
          ) : null}

          {share.status === 'pending' && !sent ? (
            <View style={styles.actions}>
              <Button
                label="Decline"
                variant="secondary"
                style={styles.actionButton}
                loading={submitting && pendingAction === 'decline'}
                disabled={submitting}
                onPress={() => respond('decline')}
              />
              <Button
                label="Accept"
                style={styles.actionButton}
                loading={submitting && pendingAction === 'accept'}
                disabled={submitting}
                onPress={() => respond('accept')}
              />
            </View>
          ) : share.status === 'pending' && sent ? (
            <Button
              label="Cancel share"
              variant="secondary"
              loading={submitting}
              disabled={submitting}
              onPress={() => respond('cancel')}
            />
          ) : null}
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerText: { flex: 1, gap: 2 },
  itemList: { gap: Spacing.sm },
  itemRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
  },
  messageBox: { borderRadius: Radius.md, padding: Spacing.md },
  error: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionButton: { flex: 1 },
});

export const ShareDetailSheet = memo(ShareDetailSheetImpl);
