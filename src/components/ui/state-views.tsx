import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function EmptyStateImpl({ icon = 'sparkles-outline', title, message, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: theme.brandTint }]}>
        <Ionicons name={icon} size={28} color={theme.brand} />
      </View>
      <Text variant="title" style={styles.centered}>
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="textSecondary" style={styles.centered}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

export const EmptyState = memo(EmptyStateImpl);

/**
 * `ApiError.isOffline` covers both a dead connection and the hung-request
 * timeout, which several unguarded async controllers in the backend can cause.
 */
function ErrorStateImpl({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Something went wrong"
      message={message ?? 'We could not load this right now.'}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
    />
  );
}

export const ErrorState = memo(ErrorStateImpl);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
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
  action: { marginTop: Spacing.sm },
});
