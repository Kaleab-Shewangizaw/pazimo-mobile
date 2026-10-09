import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, memo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { resolveImageUrl } from '@/lib/media';
import type { RecapCard as RecapCardData } from '@/types/api';

/**
 * One recap card, drawn from the admin's template (Admin → Rewards → Recap
 * cards). The dashboard has a web replica of this component for its live
 * preview — pazimo frontend `components/admin/rewards/RecapCardPreview.tsx` —
 * and the two share one sizing scheme: every length is in "card units",
 * 1u = 1/100 of the card's width, so line breaks land in the same places at
 * any size, including the 1080×1920 image it gets captured to.
 *
 * Always 9:16 — the shape TikTok, Instagram and WhatsApp stories expect.
 */

export const CARD_ASPECT = 9 / 16;

const FONT: Record<RecapCardData['font'], { bold: object; regular: object }> = {
  rounded: {
    bold: { fontFamily: 'Quicksand_700Bold' },
    regular: { fontFamily: 'Quicksand_500Medium' },
  },
  system: {
    bold: { fontWeight: '800' },
    regular: { fontWeight: '400' },
  },
  serif: {
    bold: { fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontWeight: '700' },
    regular: { fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }) },
  },
};

// Shared with the dashboard preview: shorter values get bigger type.
const valueSize = (value: string) =>
  value.length <= 4 ? 30 : value.length <= 8 ? 21 : value.length <= 14 ? 14 : 10.5;

const HERO_STATS = new Set([
  'favoriteDrink',
  'topSpot',
  'eventsAttended',
  'moviesWatched',
  'achievements',
  'outro',
]);

const STAT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  favoriteDrink: 'wine',
  topSpot: 'location',
  eventsAttended: 'musical-notes',
  moviesWatched: 'film',
  achievements: 'trophy',
  outro: 'sparkles',
};

/** CSS-style gradient angle (0° = bottom→top, 90° = left→right) → expo-linear-gradient points. */
function gradientPoints(angle: number) {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians) / 2;
  const dy = -Math.cos(radians) / 2;
  return { start: { x: 0.5 - dx, y: 0.5 - dy }, end: { x: 0.5 + dx, y: 0.5 + dy } };
}

export type RecapCardProps = {
  card: RecapCardData;
  width: number;
  /** "October 2026" — printed in the footer. */
  periodLabel: string;
};

const RecapCardImpl = forwardRef<View, RecapCardProps>(function RecapCard({ card, width, periodLabel }, ref) {
  const u = (n: number) => (n * width) / 100;
  const font = FONT[card.font] ?? FONT.rounded;
  const bgImage = card.background.type === 'image' ? resolveImageUrl(card.background.image) : null;
  const heroImage = resolveImageUrl(card.image);
  const colors = card.background.colors.length > 1 ? card.background.colors : [card.background.colors[0] ?? '#000', card.background.colors[0] ?? '#000'];
  const { start, end } = gradientPoints(card.background.angle);
  const textColor = card.textColor;
  const accent = card.accentColor;

  const eyebrow = card.eyebrow ? (
    <Text
      style={[font.bold, { color: accent, fontSize: u(3.6), letterSpacing: u(0.5), textTransform: 'uppercase' }]}>
      {card.eyebrow}
    </Text>
  ) : null;

  const value = (
    <Text
      style={[font.bold, { color: accent, fontSize: u(valueSize(card.value)), lineHeight: u(valueSize(card.value)) * 1.05 }]}
      numberOfLines={3}
      adjustsFontSizeToFit>
      {card.value}
    </Text>
  );

  const headline = (
    <Text style={[font.bold, { color: textColor, fontSize: u(6.4), lineHeight: u(6.4) * 1.15 }]}>
      {card.headline}
    </Text>
  );

  const caption = card.caption ? (
    <Text style={[font.regular, { color: textColor, opacity: 0.8, fontSize: u(3.8), lineHeight: u(3.8) * 1.35 }]}>
      {card.caption}
    </Text>
  ) : null;

  const hero = (
    <View
      style={[
        styles.hero,
        {
          borderRadius: u(5),
          borderColor: `${textColor}33`,
          backgroundColor: `${accent}33`,
        },
      ]}>
      {heroImage ? (
        <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Ionicons name={STAT_ICON[card.stat] ?? 'sparkles'} size={u(18)} color={textColor} style={{ opacity: 0.7 }} />
      )}
    </View>
  );

  return (
    <View
      ref={ref}
      // captureRef needs a real native view to snapshot; Android may otherwise
      // flatten this one away.
      collapsable={false}
      style={[styles.card, { width, height: width / CARD_ASPECT, borderRadius: u(5) }]}>
      {bgImage ? (
        <>
          <Image source={{ uri: bgImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${card.background.overlayOpacity})` }]} />
        </>
      ) : (
        <LinearGradient
          colors={colors as [string, string, ...string[]]}
          start={start}
          end={end}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={[styles.body, { padding: u(7), gap: u(3) }]}>
        {card.layout === 'big-number' ? (
          <>
            {eyebrow}
            <View style={[styles.fill, styles.center, { gap: u(4) }]}>
              {value}
              {headline}
              {caption}
            </View>
          </>
        ) : null}

        {card.layout === 'hero-image' ? (
          <>
            {eyebrow}
            {HERO_STATS.has(card.stat) ? <View style={{ height: '48%' }}>{hero}</View> : <View style={{ height: '10%' }} />}
            <View style={[styles.fill, styles.bottom, { gap: u(3) }]}>
              {value}
              {headline}
              {caption}
            </View>
          </>
        ) : null}

        {card.layout === 'poster' ? (
          <>
            <Text
              aria-hidden
              numberOfLines={1}
              style={[
                font.bold,
                styles.ghost,
                {
                  top: u(10),
                  right: u(-4),
                  fontSize: u(46),
                  lineHeight: u(46) * 1.05,
                  color: accent,
                },
              ]}>
              {card.value.length <= 5 ? card.value : card.value.slice(0, 1)}
            </Text>
            <View style={[styles.fill, styles.bottom, { gap: u(3.5) }]}>
              {eyebrow}
              <Text style={[font.bold, { color: textColor, fontSize: u(9), lineHeight: u(9) * 1.05 }]}>
                {card.headline}
              </Text>
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: accent,
                  borderRadius: u(10),
                  paddingVertical: u(1.6),
                  paddingHorizontal: u(4),
                }}>
                <Text style={[font.bold, { color: card.background.colors[0] ?? '#000', fontSize: u(4.4) }]}>
                  {card.value}
                </Text>
              </View>
              {caption}
            </View>
          </>
        ) : null}

        <View style={[styles.footer, { opacity: 0.75 }]}>
          <Text style={[font.bold, { color: textColor, fontSize: u(3.2), letterSpacing: u(0.8) }]}>PAZIMO</Text>
          <Text style={[font.regular, { color: textColor, fontSize: u(3.2) }]}>{periodLabel}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { overflow: 'hidden', backgroundColor: '#000' },
  body: { flex: 1 },
  fill: { flex: 1 },
  center: { justifyContent: 'center' },
  bottom: { justifyContent: 'flex-end' },
  hero: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  ghost: { position: 'absolute', opacity: 0.16 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

export const RecapCard = memo(RecapCardImpl);
