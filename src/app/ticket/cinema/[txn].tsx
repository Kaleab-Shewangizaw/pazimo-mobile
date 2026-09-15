import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { CinemaTicketScreen } from '@/components/ticket/cinema-ticket-screen';
import { ErrorState } from '@/components/ui/state-views';
import { useGoBack } from '@/hooks/use-go-back';
import { useTheme } from '@/hooks/use-theme';
import { useCinemaOrder } from '@/queries/cinema-orders';

/**
 * A movie order opened from the Tickets tab's Movies list — `ticket/[id].tsx`'s
 * cinema counterpart. Re-reads the same `GET /cinemas/public/orders/:id` the
 * checkout success screen watches, so the QR codes and snack list are always
 * current rather than whatever the Movies list last cached.
 */
export default function CinemaOrderDetailScreen() {
  const { txn } = useLocalSearchParams<{ txn: string }>();
  const theme = useTheme();
  const goBack = useGoBack('/(tabs)/tickets');

  const { order, isLoading, isError, error, refetch } = useCinemaOrder(txn);

  if (order?.tickets.length) {
    return <CinemaTicketScreen order={order} onDone={goBack} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#FFFFFF" />
      ) : (
        <ErrorState
          message={isError && error instanceof ApiError ? error.message : 'We could not find that order.'}
          onRetry={() => refetch()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center' },
});
