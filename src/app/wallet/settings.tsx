import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WalletCodePurpose } from '@/api/wallet';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { ListCard, ListRow } from '@/components/ui/list-row';
import { SectionHeader } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { ChangePinSheet } from '@/components/wallet/change-pin-sheet';
import { WalletCodeSheet } from '@/components/wallet/wallet-code-sheet';
import { Spacing } from '@/constants/theme';
import { useFreezeWallet } from '@/hooks/use-freeze-wallet';
import { formatPrice } from '@/lib/pricing';
import { useMyWallet } from '@/queries/wallet';

/**
 * Manage wallet — the wallet screen's hamburger menu. PIN, phone, freeze,
 * limits and the wallet's terms; rows appear only when they apply to the
 * wallet's current state on this phone.
 */
export default function WalletSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data } = useMyWallet();
  const freeze = useFreezeWallet();

  const [codeFlow, setCodeFlow] = useState<WalletCodePurpose | null>(null);
  const [changePinOpen, setChangePinOpen] = useState(false);

  const exists = Boolean(data?.exists);
  const verified = Boolean(data?.device?.verified);
  const frozen = data?.status === 'frozen';
  const etb = (amount: number) => formatPrice(amount, 'ETB');

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Manage wallet" left={<HeaderBackButton />} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {exists && verified ? (
          <View>
            <SectionHeader title="Activity" />
            <ListCard>
              <ListRow icon="receipt-outline" label="Activity" onPress={() => router.push('/wallet/activity')} />
            </ListCard>
          </View>
        ) : null}

        {exists ? (
          <View>
            <SectionHeader title="Security" />
            <ListCard>
              {verified ? (
                <ListRow icon="keypad-outline" label="Change PIN" onPress={() => setChangePinOpen(true)} />
              ) : null}
              {verified ? (
                <ListRow icon="help-circle-outline" label="Forgot PIN" onPress={() => setCodeFlow('reset_pin')} />
              ) : null}
              {verified ? (
                <ListRow icon="phone-portrait-outline" label="This phone" value="Verified" />
              ) : (
                <ListRow icon="phone-portrait-outline" label="Verify this phone" onPress={() => setCodeFlow('new_device')} />
              )}
              {frozen ? (
                data?.frozen?.canUnfreeze ? (
                  <ListRow icon="sunny-outline" label="Unfreeze wallet" onPress={() => setCodeFlow('unfreeze')} />
                ) : (
                  <ListRow icon="snow-outline" label="Frozen by Pazimo" value="Contact support" />
                )
              ) : (
                <ListRow icon="snow-outline" label="Freeze wallet" danger onPress={freeze.ask} />
              )}
            </ListCard>
          </View>
        ) : null}

        {data ? (
          <View>
            <SectionHeader title="Limits" />
            <ListCard>
              {exists && verified ? (
                <ListRow
                  icon="today-outline"
                  label="Spent today"
                  value={`${etb(data.today?.spent ?? 0)} / ${etb(data.limits.dailySpendLimit)}`}
                />
              ) : null}
              <ListRow icon="trending-up-outline" label="Daily spending" value={etb(data.limits.dailySpendLimit)} />
              <ListRow icon="arrow-down-circle-outline" label="Daily top-ups" value={etb(data.limits.dailyDepositLimit)} />
              <ListRow
                icon="swap-vertical-outline"
                label="Per top-up"
                value={`${etb(data.limits.minDeposit)} – ${etb(data.limits.maxDeposit)}`}
              />
              <ListRow icon="wallet-outline" label="Maximum balance" value={etb(data.limits.maxBalance)} />
            </ListCard>
            <Text variant="caption" color="textMuted" style={styles.footnote}>
              Wallet money can only be spent on Pazimo and can’t be withdrawn or sent to others.
            </Text>
          </View>
        ) : null}

        <View>
          <SectionHeader title="About" />
          <ListCard>
            <ListRow
              icon="document-text-outline"
              label="Wallet Terms & Conditions"
              onPress={() => router.push('/wallet/terms')}
            />
            <ListRow icon="help-buoy-outline" label="Support" onPress={() => router.push('/account/support')} />
          </ListCard>
        </View>
      </ScrollView>

      {codeFlow ? (
        <WalletCodeSheet visible purpose={codeFlow} onClose={() => setCodeFlow(null)} />
      ) : null}
      <ChangePinSheet
        visible={changePinOpen}
        onClose={() => setChangePinOpen(false)}
        onForgot={() => setCodeFlow('reset_pin')}
      />
      <ConfirmDialog
        visible={freeze.open}
        title="Freeze your wallet?"
        message="No one will be able to pay with it until it’s unfrozen. Your money stays safe in the wallet."
        confirmLabel={freeze.freezing ? 'Freezing…' : 'Freeze'}
        destructive
        onConfirm={freeze.confirm}
        onCancel={freeze.cancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },
  footnote: { marginTop: Spacing.sm, paddingHorizontal: Spacing.xs },
});
