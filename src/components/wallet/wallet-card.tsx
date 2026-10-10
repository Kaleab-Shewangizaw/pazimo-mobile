import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, Rect, Stop, LinearGradient as SvgGradient, RadialGradient, Circle } from 'react-native-svg';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { FontFamily, Spacing } from '@/constants/theme';
import { formatPrice } from '@/lib/pricing';

/** ISO/IEC 7810 ID-1 — the shape of every bank card, so it reads as one at a glance. */
const CARD_RATIO = 85.6 / 53.98;
const CARD_RADIUS = 22;

const wordmark = require('@/assets/images/pazimo-logo.png');

const FACE = {
  active: ['#0C0C10', '#17171E', '#24242E'] as const,
  frozen: ['#16202C', '#263649', '#4E6683'] as const,
};

/** The gold contact chip, drawn so it stays crisp at any card width. */
function Chip() {
  return (
    <Svg width={46} height={35} viewBox="0 0 46 35">
      <Defs>
        <SvgGradient id="chip" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F6E3A1" />
          <Stop offset="0.5" stopColor="#D4AF5A" />
          <Stop offset="1" stopColor="#A9822E" />
        </SvgGradient>
      </Defs>
      <Rect x={0.5} y={0.5} width={45} height={34} rx={7} fill="url(#chip)" stroke="#8C6A22" strokeOpacity={0.5} />
      <Line x1={0} y1={12} x2={14} y2={12} stroke="#8C6A22" strokeOpacity={0.55} />
      <Line x1={0} y1={23} x2={14} y2={23} stroke="#8C6A22" strokeOpacity={0.55} />
      <Line x1={32} y1={12} x2={46} y2={12} stroke="#8C6A22" strokeOpacity={0.55} />
      <Line x1={32} y1={23} x2={46} y2={23} stroke="#8C6A22" strokeOpacity={0.55} />
      <Rect x={14} y={7} width={18} height={21} rx={4} fill="none" stroke="#8C6A22" strokeOpacity={0.55} />
      <Line x1={23} y1={0} x2={23} y2={7} stroke="#8C6A22" strokeOpacity={0.55} />
      <Line x1={23} y1={28} x2={23} y2={35} stroke="#8C6A22" strokeOpacity={0.55} />
    </Svg>
  );
}

/** Soft glows behind the face — depth without a busy pattern. */
function Glow({ frozen }: { frozen: boolean }) {
  const tone = frozen ? '#BFE3FF' : '#D4AF5A';
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 320 202" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <RadialGradient id="g1" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={tone} stopOpacity={0.22} />
          <Stop offset="1" stopColor={tone} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="g2" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.08} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={290} cy={-10} r={150} fill="url(#g1)" />
      <Circle cx={-20} cy={230} r={140} fill="url(#g2)" />
      <Circle cx={250} cy={200} r={95} fill="none" stroke="#FFFFFF" strokeOpacity={0.05} strokeWidth={1} />
      <Circle cx={250} cy={200} r={125} fill="none" stroke="#FFFFFF" strokeOpacity={0.04} strokeWidth={1} />
    </Svg>
  );
}

/**
 * The wallet as a bank card: Pazimo wordmark, chip, balance, and the
 * holder's name embossed along the bottom. The balance can be hidden with
 * a tap for when someone's looking over a shoulder.
 */
function WalletCardImpl({
  balance,
  holderName,
  walletId,
  frozen = false,
}: {
  balance: number;
  holderName: string;
  walletId?: string;
  frozen?: boolean;
}) {
  const [hidden, setHidden] = useState(false);
  const lastFour = (walletId ?? '').slice(-4).toUpperCase().padStart(4, '0');
  const amount = formatPrice(balance, 'ETB');

  return (
    <View style={styles.shadow}>
      <LinearGradient
        colors={frozen ? FACE.frozen : FACE.active}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}>
        <Glow frozen={frozen} />
        {/* A diagonal sheen across the face, like light on laminate. */}
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0)'] as const}
          locations={[0.3, 0.5, 0.7]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.topRow}>
          <Image source={wordmark} style={styles.logo} contentFit="contain" accessibilityLabel="Pazimo" />
          {frozen ? (
            <View style={styles.frozenPill}>
              <Ionicons name="snow" size={12} color="#FFFFFF" />
              <Text style={styles.frozenText}>FROZEN</Text>
            </View>
          ) : (
            <Text style={styles.kind}>WALLET</Text>
          )}
        </View>

        <View style={styles.chipRow}>
          <Chip />
          <Ionicons name="wifi" size={24} color="rgba(255,255,255,0.7)" style={styles.contactless} />
        </View>

        <View style={styles.balanceBlock}>
          <View style={styles.balanceLabelRow}>
            <Text style={styles.caption}>AVAILABLE BALANCE</Text>
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
              hitSlop={10}
              pressedScale={0.85}
              onPress={() => setHidden((h) => !h)}>
              <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={15} color="rgba(255,255,255,0.6)" />
            </Touchable>
          </View>
          <Text
            style={styles.balance}
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLabel={hidden ? 'Balance hidden' : `Balance ${amount}`}>
            {hidden ? 'ETB ••••••' : amount}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.flex}>
            <Text style={styles.caption}>CARDHOLDER</Text>
            <Text style={styles.holder} numberOfLines={1}>
              {holderName.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.number} accessibilityLabel={`Wallet ending ${lastFour}`}>
            ••••  {lastFour}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const embossed = {
  textShadowColor: 'rgba(0,0,0,0.45)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 1,
} as const;

const styles = StyleSheet.create({
  shadow: {
    borderRadius: CARD_RADIUS,
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  card: {
    aspectRatio: CARD_RATIO,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    padding: Spacing.lg + 2,
    justifyContent: 'space-between',
  },
  flex: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 92, height: 26 },
  kind: { color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: 3, fontFamily: FontFamily.bold },
  frozenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  frozenText: { color: '#FFFFFF', fontSize: 10, letterSpacing: 2, fontFamily: FontFamily.bold },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  contactless: { transform: [{ rotate: '90deg' }] },
  balanceBlock: { gap: 2 },
  balanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  caption: { color: 'rgba(255,255,255,0.55)', fontSize: 9, letterSpacing: 1.6, fontFamily: FontFamily.bold },
  balance: { color: '#FFFFFF', fontSize: 30, lineHeight: 38, fontFamily: FontFamily.bold, ...embossed },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md },
  holder: { color: '#F2F2F5', fontSize: 15, letterSpacing: 1.8, fontFamily: FontFamily.bold, marginTop: 2, ...embossed },
  number: { color: 'rgba(255,255,255,0.8)', fontSize: 14, letterSpacing: 2, fontFamily: FontFamily.bold, ...embossed },
});

export const WalletCard = memo(WalletCardImpl);
