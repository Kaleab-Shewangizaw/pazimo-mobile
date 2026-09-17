import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { GlassButton } from '@/components/ui/glass-button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveImageUrl } from '@/lib/media';
import type { RsvpForm } from '@/types/api';

/** The wizard's own CTA bar footprint, plus room for the "Not right now" link under it. */
const CTA_BAR_HEIGHT = Spacing.md + Spacing.lg * 2 + 22 + Spacing.xl;

/**
 * The gate in front of the RSVP wizard — shows the form's own cover art and
 * description so guests decide whether they're interested before being
 * dropped into input fields. Mirrors the movie detail screen's blurred
 * backdrop + sharp poster recipe so it reads as the same app.
 */
function RsvpIntroStepImpl({
  form,
  onContinue,
  onBack,
}: {
  form: RsvpForm;
  onContinue: () => void;
  onBack: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const cover = resolveImageUrl(form.coverImage);
  const facts = [form.date, form.startTime, form.venue || form.location, form.hostedBy]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={70}
          transition={260}
          cachePolicy="memory-disk"
        />
      ) : null}
      <LinearGradient
        colors={['rgba(8,8,10,0.55)', 'rgba(8,8,10,0.9)', theme.background]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <GlassButton label="Back" icon="chevron-back" accessibilityLabel="Go back" onPress={onBack} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + CTA_BAR_HEIGHT + Spacing.lg },
        ]}>
        <View style={[styles.cover, { borderColor: theme.glassBorder }]}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={220}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.coverBlank]}>
              <Ionicons name="calendar-outline" size={40} color="rgba(255,255,255,0.3)" />
            </View>
          )}
        </View>

        <View style={styles.intro}>
          <Text variant="heading">{form.title}</Text>
          {facts ? (
            <Text variant="small" color="textSecondary">
              {facts}
            </Text>
          ) : null}
        </View>

        {form.description ? (
          <Text variant="body" color="textSecondary" style={styles.description}>
            {form.description}
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.ctaBar,
          { paddingBottom: insets.bottom + Spacing.md, borderTopColor: theme.glassBorder },
        ]}>
        <Button label="I'm interested" onPress={onContinue} size="lg" style={styles.ctaButton} />
        <Touchable accessibilityRole="button" onPress={onBack} style={styles.dismiss} pressedScale={0.98}>
          <Text variant="small" color="textMuted">
            Not right now
          </Text>
        </Touchable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    zIndex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.xl,
    gap: Spacing.lg,
  },
  cover: {
    width: '100%',
    aspectRatio: AspectRatio.card,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  coverBlank: { alignItems: 'center', justifyContent: 'center' },
  intro: { gap: Spacing.xs },
  description: { lineHeight: 22 },
  ctaBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ctaButton: { width: '100%' },
  dismiss: { paddingVertical: Spacing.xs },
});

export const RsvpIntroStep = memo(RsvpIntroStepImpl);
