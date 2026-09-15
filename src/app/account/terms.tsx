import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';

type Section = { heading: string; body: string };

const SECTIONS: Section[] = [
  {
    heading: '1. Acceptance of terms',
    body: "By creating a Pazimo account or buying a ticket through Pazimo, you agree to these Terms. If you don't agree, please don't use the app.",
  },
  {
    heading: '2. What Pazimo is',
    body: 'Pazimo is a marketplace that lets Organizers list events and sell tickets, and lets you discover events and buy those tickets. For any given event, the Organizer — not Pazimo — is responsible for the event itself: its content, safety, schedule, and delivery.',
  },
  {
    heading: '3. Your account',
    body: "You're responsible for keeping your password confidential and for everything that happens under your account. Tell us right away if you think someone else has access to it. You must be at least 18, or have a parent or guardian's permission, to create an account.",
  },
  {
    heading: '4. Buying tickets',
    body: 'A ticket purchase is a contract between you and the Organizer; Pazimo processes the payment on the Organizer\'s behalf. Prices, availability, and any age or ID requirements are set by the Organizer and shown at checkout.',
  },
  {
    heading: '5. Cancellations & refunds',
    body: "Refund and exchange policies are set by each Organizer and shown on the event page. If an Organizer cancels or reschedules an event, refunds are handled per that Organizer's stated policy and applicable consumer-protection law.",
  },
  {
    heading: '6. Account use',
    body: "Don't use Pazimo to resell tickets in violation of an Organizer's terms, harass other users, impersonate someone else, or attempt to access another account. We may suspend or close accounts that violate these Terms or that we reasonably believe are being used fraudulently.",
  },
  {
    heading: '7. Liability',
    body: "Pazimo facilitates ticket sales but doesn't organize, run, or guarantee the events listed on it. To the extent permitted by law, Pazimo isn't liable for how an event is run, for injuries or losses at an event, or for an Organizer's failure to honor a ticket.",
  },
  {
    heading: '8. Changes to these terms',
    body: "We may update these Terms from time to time. Continuing to use Pazimo after a change means you accept the updated Terms.",
  },
  {
    heading: '9. Governing law',
    body: 'These Terms are governed by the laws of Ethiopia. Any dispute will first be handled through good-faith negotiation, and failing that, by the courts of Addis Ababa.',
  },
];

export default function TermsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Terms & Conditions" left={<HeaderBackButton />} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl,
            paddingBottom: tabBarClearance(insets.bottom),
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text variant="caption" color="textMuted">
          Effective September 14, 2026
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
