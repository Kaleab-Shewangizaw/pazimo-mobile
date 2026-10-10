import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';

type Section = { heading: string; body: string };

// DRAFT — to be reviewed by Pazimo legal before launch.
const SECTIONS: Section[] = [
  {
    heading: '1. About Pazimo Wallet',
    body: 'Pazimo Wallet is a stored balance you can use to pay for tickets, cinema and drinks inside the Pazimo app. By setting up a wallet you agree to these Wallet Terms, in addition to the Pazimo Terms & Conditions.',
  },
  {
    heading: '2. Adding money',
    body: 'You can add money with the payment methods shown in the app. Top-ups are subject to minimum and maximum amounts, a daily top-up limit and a maximum wallet balance, all shown under Manage wallet. A top-up is only added to your wallet once the payment provider confirms it.',
  },
  {
    heading: '3. Using your balance',
    body: 'Wallet money can only be spent on Pazimo. It can’t be withdrawn as cash, transferred to a bank, or sent to another person. Wallet payments are subject to a daily spending limit.',
  },
  {
    heading: '4. Your PIN and your phones',
    body: 'Every wallet payment needs your 6-digit PIN, and your wallet only works on phones you’ve verified with a code sent to your number. Keep your PIN secret — anyone who knows it and has a verified phone can pay with your wallet. For your safety, payments may pause for a while after a PIN reset or on a newly verified phone, and your PIN locks after too many wrong tries.',
  },
  {
    heading: '5. Freezing your wallet',
    body: 'If you lose your phone or think someone else has your PIN, freeze your wallet from the app right away. A frozen wallet can’t be used to pay; your balance stays safe. Pazimo may also freeze a wallet to protect you or to investigate suspected fraud, in which case you’ll need to contact support.',
  },
  {
    heading: '6. Refunds',
    body: 'When a purchase you paid for with your wallet is refunded, the money goes back to your wallet, not to the original top-up method.',
  },
  {
    heading: '7. Mistakes and corrections',
    body: 'If money is added to or taken from your wallet in error, Pazimo may correct your balance. Every correction appears in your wallet activity.',
  },
  {
    heading: '8. Changes and closure',
    body: 'We may change these Wallet Terms, the limits or the payment methods from time to time. Continuing to use the wallet after a change means you accept it. We may suspend or close a wallet that is used in breach of these Terms.',
  },
];

/** The terms a customer agrees to before setting up their wallet. */
export default function WalletTermsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Wallet Terms" left={<HeaderBackButton />} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text variant="caption" color="textMuted">
          Effective October 10, 2026
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text variant="title">{section.heading}</Text>
            <Text variant="body" color="textSecondary">
              {section.body}
            </Text>
          </View>
        ))}

        <View style={styles.section}>
          <Text variant="title">Questions?</Text>
          <Text variant="body" color="textSecondary">
            Contact us at support@pazimo.com or +251 991 051 844.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },
  section: { gap: Spacing.xs },
});
