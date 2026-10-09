import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthSheet } from '@/components/account/auth-sheet';
import { NotificationRow } from '@/components/notifications/notification-row';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassIconButton } from '@/components/ui/glass-button';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { Touchable } from '@/components/ui/pressable';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Radius, Spacing } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { openNotificationTarget } from '@/lib/notification-routing';
import { useMarkNotificationsRead, useNotifications } from '@/queries/notifications';
import { useAuthStore } from '@/stores/use-auth-store';
import type { AppNotification } from '@/types/api';

/**
 * The bell's inbox: shares sent to or answered by you, and announcements from
 * Pazimo — kept server-side, so it's complete even for pushes this device
 * never showed (permission off, swiped away, another phone). Tapping a row
 * marks it read and goes wherever its push would have.
 */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const goBack = useGoBack();
  const user = useAuthStore((s) => s.user);
  const [signInVisible, setSignInVisible] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotifications();
  const { submit: markRead } = useMarkNotificationsRead();
  const { refreshing, onRefresh } = useRefresh(refetch);

  const openNotification = useCallback(
    (notification: AppNotification) => {
      if (!notification.readAt) markRead({ ids: [notification._id] });
      openNotificationTarget(router, notification.data);
    },
    [markRead, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => <NotificationRow notification={item} onPress={openNotification} />,
    [openNotification],
  );

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.lg;

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader
        title="Notifications"
        left={
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={goBack}
            pressedScale={0.9}
            style={[styles.backButton, { backgroundColor: theme.surfaceMuted }]}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Touchable>
        }
        right={
          user ? (
            <View style={styles.headerActions}>
              {unreadCount > 0 ? (
                <GlassIconButton
                  icon="checkmark-done"
                  accessibilityLabel="Mark all as read"
                  size={34}
                  onPress={() => markRead()}
                />
              ) : null}
              <GlassIconButton
                icon="settings-outline"
                accessibilityLabel="Notification settings"
                size={34}
                onPress={() => router.push('/account/notifications')}
              />
            </View>
          ) : undefined
        }
      />

      {!user ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <EmptyState
            icon="notifications-outline"
            title="Sign in for notifications"
            message="Sign in to hear when someone sends you a ticket or a drink, and for news from Pazimo."
            actionLabel="Sign in"
            onAction={() => setSignInVisible(true)}
          />
        </View>
      ) : isLoading && notifications.length === 0 ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(notification) => notification._id}
          renderItem={renderItem}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          contentContainerStyle={[
            styles.list,
            { paddingTop: topPadding, paddingBottom: insets.bottom + Spacing.xl },
          ]}
          refreshControl={
            <PageRefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={topPadding} />
          }
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator style={styles.footer} color="#FFFFFF" /> : null
          }
          ListEmptyComponent={
            isError ? (
              <ErrorState message={error?.message} onRetry={() => refetch()} />
            ) : (
              <EmptyState
                icon="notifications-outline"
                title="You're all caught up"
                message="When someone sends you a ticket or a drink, or answers one you sent, it shows up here."
              />
            )
          }
        />
      )}

      <AuthSheet visible={signInVisible} onClose={() => setSignInVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { gap: Spacing.xs },
  footer: { paddingVertical: Spacing.lg },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
