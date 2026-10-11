import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { FlatList, type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { refillSaleBarcodeUrl } from '@/api/beverages';
import { DrinkArt } from '@/components/refill/drink-art';
import { QrPlate } from '@/components/ticket/qr-plate';
import { TicketFrame } from '@/components/ticket/ticket-frame';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveImageUrl } from '@/lib/media';
import { formatPrice } from '@/lib/pricing';
import type { RefillOrder, RefillOrderSale } from '@/types/api';

/**
 * A paid drink order, drawn on the same ticket every other purchase lands
 * on — `TicketView`'s counterpart, and like it, sized to the screen: the
 * whole ticket is visible without scrolling, however many drinks are on it.
 *
 * Up top, the drinks themselves (their own cutouts, floating). Then the
 * pickup code — one drink at a time, swiped sideways when the order has
 * several, so the ticket never grows. Below the tear, a one-line receipt
 * over a soft blur of the lead drink.
 */

/** Widest the barcode plate gets — a tablet shouldn't get a slab. */
const PLATE_MAX = 300;
/**
 * White margin inside the plate around the bars. Scanners need a clear
 * "quiet zone" either side, and the plate's big rounded corners would
 * otherwise clip the outermost bars — which is what made it unscannable.
 */
const PLATE_PAD_X = 20;
const PLATE_PAD_Y = 12;
/** Until the image reports its real size — bwip-js Code 128 with text is roughly this shape. */
const DEFAULT_BARCODE_ASPECT = 2.6;
/** The hero never drops below this, nor takes more than this, of the stub. */
const HERO_MIN = 72;
const HERO_MAX = 170;
/** At most this many drinks in the hero shot — more just crowds it. */
const HERO_DRINKS = 3;

export type RefillOrderViewProps = {
  order: RefillOrder;
};

function collectible(sale: RefillOrderSale): boolean {
  return sale.status !== 'refunded' && !sale.redeemedAt;
}

function RefillOrderViewImpl({ order }: RefillOrderViewProps) {
  const sales = order.sales;
  const [panelWidth, setPanelWidth] = useState(0);
  const [page, setPage] = useState(0);
  if (!sales.length) return null;

  const units = sales.reduce((n, sale) => n + sale.quantity, 0);
  const lead = sales[0];
  const leadImage = resolveImageUrl(lead.beverage?.image);
  // Glows while there's still something to pick up — the same "this still
  // gets you something" signal the event ticket's edge light gives.
  const alive = sales.some(collectible);
  const title = sales.length === 1 ? lead.beverageName : `${units} drinks`;

  return (
    <TicketFrame
      fill
      glowing={alive}
      detailsBackground={
        leadImage ? (
          <>
            <Image
              source={{ uri: leadImage }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={28}
              transition={220}
            />
            <View style={styles.scrim} />
          </>
        ) : null
      }
      stub={
        <View style={styles.stub}>
          <Text variant="label" color="textSecondary" style={styles.centered}>
            DRINK PICKUP
          </Text>

          {/* Takes whatever height the rest leaves — the part that gives way
              on a short phone, so the barcode never has to. */}
          <HeroSlot sales={sales} />

          <Text variant="title" role="heading" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <Text variant="caption" color="textSecondary" style={styles.centered}>
            {sales.length > 1 ? 'Swipe for each drink · show the code at the counter' : 'Show this code at the counter'}
          </Text>

          <View
            style={styles.panel}
            onLayout={(e: LayoutChangeEvent) => setPanelWidth(e.nativeEvent.layout.width)}>
            {panelWidth > 0 ? (
              sales.length === 1 ? (
                <SalePanel sale={lead} currency={order.currency} width={panelWidth} />
              ) : (
                <FlatList
                  data={sales}
                  keyExtractor={(sale) => sale.referenceNumber}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / panelWidth))}
                  renderItem={({ item }) => (
                    <SalePanel sale={item} currency={order.currency} width={panelWidth} />
                  )}
                />
              )
            ) : null}
          </View>

          {sales.length > 1 ? <Dots count={sales.length} active={page} /> : null}
        </View>
      }
      details={
        <View style={styles.details}>
          <Fact label="Drinks" value={`${units}`} />
          <View style={styles.factDivider} />
          <Fact label="Total" value={formatPrice(order.total, order.currency)} />
          <View style={styles.factDivider} />
          <Fact label="Order" value={`#${order.transactionId.slice(-6).toUpperCase()}`} />
        </View>
      }
    />
  );
}

/** Measures the room left in the stub and fits the hero shot into it. */
function HeroSlot({ sales }: { sales: RefillOrderSale[] }) {
  const [height, setHeight] = useState(0);
  const heroHeight = Math.min(Math.max(height, HERO_MIN), HERO_MAX);
  return (
    <View style={styles.heroSlot} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 ? <DrinkHero sales={sales} height={heroHeight} /> : null}
    </View>
  );
}

/**
 * The drinks as one product shot: the lead drink in front and largest, up to
 * two more set back on either side. A single drink just floats on its own.
 */
function DrinkHero({ sales, height }: { sales: RefillOrderSale[]; height: number }) {
  const shown = sales.slice(0, HERO_DRINKS);
  const [lead, left, right] = shown;

  return (
    <View style={[styles.hero, { height }]}>
      {left ? (
        <View style={[styles.heroSide, styles.heroLeft]}>
          <DrinkArt imageUrl={resolveImageUrl(left.beverage?.image)} height={height * 0.72} />
        </View>
      ) : null}
      {right ? (
        <View style={[styles.heroSide, styles.heroRight]}>
          <DrinkArt imageUrl={resolveImageUrl(right.beverage?.image)} height={height * 0.72} />
        </View>
      ) : null}
      <View style={left ? styles.heroLeadBetween : styles.heroLeadAlone}>
        <DrinkArt imageUrl={resolveImageUrl(lead.beverage?.image)} height={height} />
      </View>
    </View>
  );
}

/** One drink's pickup: what it is, its status, and its barcode. */
function SalePanel({
  sale,
  currency,
  width,
}: {
  sale: RefillOrderSale;
  currency: RefillOrder['currency'];
  width: number;
}) {
  const plateWidth = Math.min(width, PLATE_MAX);

  return (
    <View style={[styles.salePanel, { width }]}>
      <View style={[styles.saleHeader, { width: plateWidth }]}>
        <View style={styles.saleText}>
          <Text variant="callout" numberOfLines={1}>
            {sale.beverageName}
          </Text>
          <Text variant="caption" color="textSecondary">
            {sale.quantity > 1 ? `× ${sale.quantity} · ` : ''}
            {formatPrice(sale.totalAmount, currency)}
          </Text>
        </View>
        <StatusChip sale={sale} />
      </View>
      <SaleBarcode reference={sale.referenceNumber} width={plateWidth} spent={!collectible(sale)} />
    </View>
  );
}

/**
 * The pickup barcode, never cropped: the plate takes the image's own
 * proportions (read once it loads — a Code 128's width depends on the
 * code's length), with white margin all round. The printed code under the
 * bars stays too, so staff can type it if a scan fails.
 */
function SaleBarcode({ reference, width, spent }: { reference: string; width: number; spent: boolean }) {
  const [aspect, setAspect] = useState(DEFAULT_BARCODE_ASPECT);
  const innerWidth = width - PLATE_PAD_X * 2;
  const height = innerWidth / aspect + PLATE_PAD_Y * 2;

  return (
    // A used or refunded code stays visible (people check what they had)
    // but dimmed, so nobody tries to scan it again.
    <View style={spent && styles.spent}>
      <QrPlate size={width} height={height}>
        <Image
          source={{ uri: refillSaleBarcodeUrl(reference) }}
          style={{ width: innerWidth, height: innerWidth / aspect }}
          contentFit="contain"
          transition={150}
          onLoad={(e) => {
            const { width: w, height: h } = e.source;
            if (w > 0 && h > 0) setAspect(w / h);
          }}
        />
      </QrPlate>
    </View>
  );
}

function StatusChip({ sale }: { sale: RefillOrderSale }) {
  const theme = useTheme();

  const { label, icon, color } =
    sale.status === 'refunded'
      ? { label: 'Refunded', icon: 'return-down-back-outline' as const, color: theme.danger }
      : sale.redeemedAt
        ? { label: 'Collected', icon: 'checkmark-circle' as const, color: theme.success }
        : { label: 'Ready', icon: 'time-outline' as const, color: theme.text };

  return (
    <View style={[styles.chip, { borderColor: theme.glassBorder, backgroundColor: theme.glassStrong }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text variant="caption" style={[styles.chipText, { color }]}>
        {label}
      </Text>
    </View>
  );
}

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
      ))}
    </View>
  );
}

/** One column of the receipt line below the tear. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text variant="label" color="textMuted" style={styles.factLabel}>
        {label.toUpperCase()}
      </Text>
      <Text variant="small" numberOfLines={1} style={styles.factValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stub: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  centered: { textAlign: 'center' },
  title: { color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.3 },

  heroSlot: { flex: 1, alignSelf: 'stretch', minHeight: HERO_MIN, maxHeight: HERO_MAX, justifyContent: 'center' },
  hero: { width: '100%' },
  heroLeadAlone: { position: 'absolute', left: 0, right: 0, top: 0 },
  heroLeadBetween: { position: 'absolute', left: '24%', right: '24%', top: 0 },
  heroSide: { position: 'absolute', width: '40%', bottom: 0, opacity: 0.85 },
  heroLeft: { left: '6%' },
  heroRight: { right: '6%' },

  panel: { alignSelf: 'stretch', marginTop: Spacing.sm },
  salePanel: { alignItems: 'center', gap: Spacing.sm },
  saleHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  saleText: { flex: 1, gap: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontFamily: FontFamily.bold },
  spent: { opacity: 0.35 },

  dots: { flexDirection: 'row', gap: 6, marginTop: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { width: 16, backgroundColor: '#FFFFFF' },

  details: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  fact: { flex: 1, alignItems: 'center', gap: 2 },
  factLabel: { fontSize: 10 },
  factValue: { color: '#FFFFFF', fontFamily: FontFamily.bold },
  factDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.14)' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(6,6,8,0.82)' },
});

export const RefillOrderView = memo(RefillOrderViewImpl);
