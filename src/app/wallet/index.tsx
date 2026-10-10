import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WalletCodePurpose } from '@/api/wallet';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { GlassIconButton } from '@/components/ui/glass-button';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { Touchable } from '@/components/ui/pressable';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { DepositSheet } from '@/components/wallet/deposit-sheet';
import { WalletCard } from '@/components/wallet/wallet-card';
import { WalletCodeSheet } from '@/components/wallet/wallet-code-sheet';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useFreezeWallet } from '@/hooks/use-freeze-wallet';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/pricing';
import { untilLabel } from '@/lib/wallet';
import { useMyWallet } from '@/queries/wallet';
import { displayName, useAuthStore } from '@/stores/use-auth-store';

type IconName = keyof typeof Ionicons.glyphMap;

/** Everywhere the wallet is accepted — each opens that part of the app. */
const USES: { icon: IconName; label: string; href: Href }[] = [
  { icon: 'ticket-outline', label: 'Events', href: '/(tabs)/discover' },
  { icon: 'film-outline', label: 'Cinema', href: '/(tabs)/cinema' },
  { icon: 'beer-outline', label: 'Drinks', href: '/(tabs)/refill' },
];

/**
 * Pazimo Wallet: the card, adding money, and the way into Activity and
 * Manage wallet (the hamburger). Where every wallet push lands.
 *
 * What this screen shows depends on the wallet's state as seen from THIS
 * phone: not set up, set up but this phone not verified, frozen, or ready.
 */
export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const wallet = useMyWallet();
  const data = wallet.data;
  const { refreshing, onRefresh } = useRefresh(wallet.refetch);
  const freeze = useFreezeWallet();

  const [codeFlow, setCodeFlow] = useState<WalletCodePurpose | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl;
  // The ready wallet has its own Manage button; the menu is only for the
  // states without one (before setup, and on a phone not yet verified).
  const showMenu = Boolean(data && (data.enabled || data.exists) && !(data.exists && data.device?.verified));

  const renderBody = () => {
    if (!data) return null;

    if (!data.enabled && !data.exists) {
      return (
        <EmptyState
          icon="wallet-outline"
          title="Wallet isn’t available yet"
          message="Pazimo Wallet is coming soon."
        />
      );
    }

    if (!data.exists) {
      return (
        <View style={styles.introBlock}>
          <View style={[styles.introIcon, { backgroundColor: theme.brandTint }]}>
            <Ionicons name="wallet" size={36} color={theme.text} />
          </View>
          <Text variant="heading" style={styles.center}>
            Pay in one tap
          </Text>
          <Text variant="body" color="textSecondary" style={styles.center}>
            Add money once with Telebirr, CBE Birr or M-Pesa, then pay for tickets, cinema and drinks
            with your PIN — no waiting for a phone prompt.
          </Text>
          <View style={styles.points}>
            {[
              ['lock-closed', 'Protected by a PIN and tied to your phone'],
              ['notifications', 'An SMS and a notification for every payment'],
              ['information-circle', 'Only for Pazimo — wallet money can’t be withdrawn'],
            ].map(([icon, text]) => (
              <View key={text} style={styles.point}>
                <Ionicons name={icon as IconName} size={18} color={theme.textSecondary} />
                <Text variant="small" color="textSecondary" style={styles.flex}>
                  {text}
                </Text>
              </View>
            ))}
          </View>

          <Touchable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            accessibilityLabel="I agree to the Pazimo Wallet Terms & Conditions"
            onPress={() => setAgreed((a) => !a)}
            pressedScale={0.99}
            style={[styles.agree, { borderColor: agreed ? theme.text : theme.glassBorder, backgroundColor: theme.surface }]}>
            <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={22} color={agreed ? theme.text : theme.textSecondary} />
            <Text variant="small" color="textSecondary" style={styles.flex}>
              I’ve read and agree to the{' '}
              <Text variant="small" style={styles.link} onPress={() => router.push('/wallet/terms')}>
                Pazimo Wallet Terms & Conditions
              </Text>
              .
            </Text>
          </Touchable>

          <Button
            label="Set up wallet"
            size="lg"
            disabled={!agreed}
            onPress={() => setCodeFlow('setup')}
            style={styles.stretch}
          />
        </View>
      );
    }

    if (!data.device?.verified) {
      return (
        <View style={styles.introBlock}>
          <View style={[styles.introIcon, { backgroundColor: theme.brandTint }]}>
            <Ionicons name="phone-portrait" size={36} color={theme.text} />
          </View>
          <Text variant="heading" style={styles.center}>
            Verify this phone
          </Text>
          <Text variant="body" color="textSecondary" style={styles.center}>
            Your wallet only works on phones you’ve verified with a code sent to your number.
          </Text>
          <Button label="Verify this phone" size="lg" onPress={() => setCodeFlow('new_device')} style={styles.stretch} />
          <Button label="I lost my phone — freeze my wallet" variant="ghost" onPress={freeze.ask} />
        </View>
      );
    }

    const frozen = data.status === 'frozen';
    const notices: string[] = [];
    if (frozen) {
      notices.push(
        data.frozen?.canUnfreeze
          ? 'You froze your wallet. Unfreeze it to pay again.'
          : 'Your wallet is frozen for your security. Contact Pazimo support.',
      );
    }
    if (data.device.spendAllowedAfter) {
      notices.push(`This phone can pay with the wallet ${untilLabel(data.device.spendAllowedAfter)}.`);
    }
    if (data.spendBlockedUntil) {
      notices.push(`Wallet payments resume ${untilLabel(data.spendBlockedUntil)} after your PIN reset.`);
    }
    if (data.pinLockedUntil) {
      notices.push(`Your PIN is locked after too many wrong tries. Try again ${untilLabel(data.pinLockedUntil)}.`);
    }

    const primary: { icon: IconName; label: string; onPress: () => void } | null = frozen
      ? data.frozen?.canUnfreeze
        ? { icon: 'sunny-outline', label: 'Unfreeze', onPress: () => setCodeFlow('unfreeze') }
        : null
      : { icon: 'add', label: 'Add money', onPress: () => setDepositOpen(true) };

    const spent = data.today?.spent ?? 0;
    const dailyLimit = data.limits.dailySpendLimit;
    const spentShare = dailyLimit > 0 ? Math.min(1, spent / dailyLimit) : 0;

    const actions: { icon: IconName; label: string; onPress: () => void }[] = [
      ...(primary ? [primary] : []),
      { icon: 'receipt-outline', label: 'Activity', onPress: () => router.push('/wallet/activity') },
      { icon: 'options-outline', label: 'Manage', onPress: () => router.push('/wallet/settings') },
    ];

    return (
      <>
        <WalletCard
          balance={data.balance ?? 0}
          holderName={displayName(user)}
          walletId={data.id}
          frozen={frozen}
        />

        <View style={styles.actions}>
          {actions.map((action, index) => {
            const solid = index === 0 && action === primary;
            return (
              <Touchable
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={action.onPress}
                haptic={solid}
                style={styles.action}>
                <View
                  style={[
                    styles.actionDisc,
                    solid
                      ? { backgroundColor: theme.brand }
                      : { backgroundColor: theme.surface, borderColor: theme.glassBorder, borderWidth: StyleSheet.hairlineWidth },
                  ]}>
                  <Ionicons name={action.icon} size={24} color={solid ? theme.onBrand : theme.text} />
                </View>
                <Text variant="small" style={styles.actionLabel}>
                  {action.label}
                </Text>
              </Touchable>
            );
          })}
        </View>

        {notices.length ? (
          <View style={[styles.notice, { borderColor: theme.glassBorder, backgroundColor: theme.surface }]}>
            {notices.map((notice) => (
              <View key={notice} style={styles.point}>
                <Ionicons name={frozen ? 'snow-outline' : 'time-outline'} size={16} color={theme.textSecondary} />
                <Text variant="small" color="textSecondary" style={styles.flex}>
                  {notice}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {frozen ? null : (
          <View style={[styles.panel, { borderColor: theme.glassBorder, backgroundColor: theme.surface }]}>
            <View style={styles.panelHead}>
              <Text variant="label" color="textSecondary">
                TODAY
              </Text>
              <Text variant="caption" color="textMuted">
                Resets at midnight
              </Text>
            </View>
            <View style={styles.stats}>
              <View style={styles.flex}>
                <Text variant="caption" color="textMuted">
                  Spent
                </Text>
                <Text variant="title">{formatPrice(spent, 'ETB')}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.hairline }]} />
              <View style={styles.flex}>
                <Text variant="caption" color="textMuted">
                  Added
                </Text>
                <Text variant="title">{formatPrice(data.today?.deposited ?? 0, 'ETB')}</Text>
              </View>
            </View>
            <View
              style={[styles.track, { backgroundColor: theme.surfaceMuted }]}
              accessible
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(spentShare * 100) }}
              accessibilityLabel="Daily spending limit used">
              <View style={[styles.fill, { width: `${spentShare * 100}%`, backgroundColor: theme.text }]} />
            </View>
            <Text variant="caption" color="textMuted">
              {formatPrice(Math.max(0, dailyLimit - spent), 'ETB')} left of your {formatPrice(dailyLimit, 'ETB')} daily
              spending limit
            </Text>
          </View>
        )}

        <View>
          <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
            PAY WITH YOUR WALLET
          </Text>
          <View style={styles.uses}>
            {USES.map((use) => (
              <Touchable
                key={use.label}
                accessibilityRole="button"
                accessibilityLabel={use.label}
                onPress={() => router.push(use.href)}
                style={[styles.use, { borderColor: theme.glassBorder, backgroundColor: theme.surface }]}>
                <Ionicons name={use.icon} size={24} color={theme.text} />
                <Text variant="small" style={styles.actionLabel}>
                  {use.label}
                </Text>
              </Touchable>
            ))}
          </View>
        </View>


        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={14} color={theme.textMuted} />
          <Text variant="caption" color="textMuted">
            Protected by your PIN and tied to this phone
          </Text>
        </View>
      </>
    );
  };

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader
        title="Wallet"
        left={<HeaderBackButton />}
        right={
          showMenu ? (
            <GlassIconButton
              icon="menu-outline"
              accessibilityLabel="Manage wallet"
              onPress={() => router.push('/wallet/settings')}
            />
          ) : undefined
        }
      />

      {wallet.isLoading ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : wallet.isError || !data ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ErrorState onRetry={() => wallet.refetch()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: insets.bottom + Spacing.xxl }]}
          refreshControl={<PageRefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={topPadding} />}
          showsVerticalScrollIndicator={false}>
          {renderBody()}
        </ScrollView>
      )}

      {codeFlow ? (
        <WalletCodeSheet visible purpose={codeFlow} onClose={() => setCodeFlow(null)} />
      ) : null}
      {data?.exists ? (
        <DepositSheet visible={depositOpen} onClose={() => setDepositOpen(false)} wallet={data} />
      ) : null}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  stretch: { alignSelf: 'stretch' },

  introBlock: { alignItems: 'center', gap: Spacing.lg, paddingTop: Spacing.lg },
  introIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  points: { gap: Spacing.sm, alignSelf: 'stretch' },
  point: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  agree: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  link: { fontFamily: FontFamily.bold, textDecorationLine: 'underline' },

  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: Spacing.sm },
  action: { alignItems: 'center', gap: Spacing.sm, minWidth: 76 },
  actionDisc: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: FontFamily.bold },

  sectionLabel: { marginBottom: Spacing.sm, paddingHorizontal: Spacing.xs },
  panel: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  uses: { flexDirection: 'row', gap: Spacing.md },
  use: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },

  notice: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
});
