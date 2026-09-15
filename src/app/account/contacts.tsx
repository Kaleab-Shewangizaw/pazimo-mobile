import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContactCardSheet } from '@/components/shares/contact-card-sheet';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { ListRow } from '@/components/ui/list-row';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useContacts } from '@/queries/messages';
import type { ContactSummary } from '@/types/api';

/** Adding/removing happens from a chat's contact card — this screen only lists what that produced. */
export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const { contacts, isLoading, isError, error, refetch } = useContacts();
  const { refreshing, onRefresh } = useRefresh(refetch);

  const [openContactId, setOpenContactId] = useState<string | null>(null);

  const renderItem = useCallback<ListRenderItem<ContactSummary>>(
    ({ item }) => (
      <ListRow
        icon="person-circle-outline"
        label={[item.firstName, item.lastName].filter(Boolean).join(' ').trim() || 'Pazimo user'}
        value={item.username ? `@${item.username}` : undefined}
        onPress={() => setOpenContactId(item._id)}
      />
    ),
    [],
  );

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.lg;

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Contacts" left={<HeaderBackButton />} />

      {isLoading && contacts.length === 0 ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : (
        <FlatList
          data={contacts}
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
                icon="people-outline"
                title="No contacts yet"
                message="Add someone as a contact from a chat's contact card to see them here."
              />
            )
          }
        />
      )}

      <ContactCardSheet
        counterpartyId={openContactId ?? ''}
        visible={Boolean(openContactId)}
        onClose={() => setOpenContactId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg },
});
