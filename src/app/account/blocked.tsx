import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { ListRow } from '@/components/ui/list-row';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useBlockedUsers, useSetBlocked } from '@/queries/messages';
import type { BlockedUser } from '@/types/api';

export default function BlockedAccountsScreen() {
  const insets = useSafeAreaInsets();
  const { blocked, isLoading, isError, error, refetch } = useBlockedUsers();
  const { refreshing, onRefresh } = useRefresh(refetch);
  const { set: setBlocked } = useSetBlocked();

  const [pendingUnblock, setPendingUnblock] = useState<BlockedUser | null>(null);

  const confirmUnblock = useCallback(async () => {
    if (!pendingUnblock) return;
    const id = pendingUnblock._id;
    setPendingUnblock(null);
    await setBlocked(id, false);
  }, [pendingUnblock, setBlocked]);

  const renderItem = useCallback<ListRenderItem<BlockedUser>>(
    ({ item }) => (
      <ListRow
        icon="person-circle-outline"
        label={[item.firstName, item.lastName].filter(Boolean).join(' ').trim() || 'Pazimo user'}
        value="Unblock"
        onPress={() => setPendingUnblock(item)}
      />
    ),
    [],
  );

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.lg;

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Blocked accounts" left={<HeaderBackButton />} />

      {isLoading && blocked.length === 0 ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            { paddingTop: topPadding, paddingBottom: tabBarClearance(insets.bottom) },
          ]}
          refreshControl={
            <PageRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              progressViewOffset={topPadding}
            />
          }
          ListEmptyComponent={
            isError ? (
              <ErrorState message={error?.message} onRetry={() => refetch()} />
            ) : (
              <EmptyState
                icon="ban-outline"
                title="No blocked accounts"
                message="Accounts you block can't message you or add you as a contact."
              />
            )
          }
        />
      )}

      <ConfirmDialog
        visible={Boolean(pendingUnblock)}
        title={`Unblock ${pendingUnblock ? [pendingUnblock.firstName, pendingUnblock.lastName].filter(Boolean).join(' ').trim() : ''}?`}
        message="They'll be able to message you and add you as a contact again."
        confirmLabel="Unblock"
        onConfirm={confirmUnblock}
        onCancel={() => setPendingUnblock(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg },
});
