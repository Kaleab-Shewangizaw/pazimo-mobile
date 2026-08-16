import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { TicketScreen } from '@/components/ticket/ticket-screen';
import { ErrorState } from '@/components/ui/state-views';
import { useGoBack } from '@/hooks/use-go-back';
import { useTheme } from '@/hooks/use-theme';
import { useTicketGroup } from '@/queries/tickets';

/**
 * A ticket opened from the list, together with every other ticket bought for
 * the same event so they can be swiped between.
 *
 * Falls back to the public lookup — keyed on the `ticketId` printed on the
 * ticket — when the id isn't in this account's list, which is what lets a
 * shared or deep-linked ticket open with no session at all.
 */
export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const goBack = useGoBack();

  const { tickets, initialIndex, isLoading, isError, error, refetch } = useTicketGroup(id);

  if (tickets.length) {
    return <TicketScreen tickets={tickets} initialIndex={initialIndex} onBack={goBack} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#FFFFFF" />
      ) : (
        <ErrorState
          message={
            isError && error instanceof ApiError ? error.message : 'We could not find that ticket.'
          }
          onRetry={() => refetch()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center' },
});
