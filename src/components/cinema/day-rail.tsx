import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import type { DayKey } from '@/lib/programme';

/**
 * Today / Tomorrow / Coming Soon.
 *
 * Rendered as three discrete controls matching the reference design:
 *   - "Coming Soon" — plain dim text on the left (opens date picker)
 *   - "Now Playing"  — the active center label, white + bold when selected
 *   - "Tomorrow ›"  — pill with border on the right, always pill-shaped
 *
 * Count badges are intentionally omitted — the reference image doesn't show
 * them and the poster deck communicates availability through its own empty-state.
 */

export type DayRailProps = {
  active: DayKey;
  todayCount: number;
  tomorrowCount: number;
  /** "Coming Soon", or the picked date's short label once one is chosen. */
  laterLabel: string;
  laterCount: number;
  onSelectToday: () => void;
  onSelectTomorrow: () => void;
  /** Opens the date picker rather than selecting a day directly. */
  onOpenLater: () => void;
};

function DayRailImpl({
  active,
  laterLabel,
  onSelectToday,
  onSelectTomorrow,
  onOpenLater,
}: DayRailProps) {
  return (
    <View style={styles.rail}>
      {/* Left — "Coming Soon" plain text */}
      <Touchable
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'later' }}
        accessibilityLabel={`${laterLabel}, open date picker`}
        onPress={onOpenLater}
        pressedScale={0.94}
        style={styles.sideTab}
      >
        <Text
          variant="small"
          numberOfLines={1}
          style={[styles.sideLabel, active === 'later' && styles.sideLabelActive]}
        >
          {laterLabel}
        </Text>
      </Touchable>

      {/* Center — "Now Playing" / "Tomorrow" — the primary active state */}
      <Touchable
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'today' }}
        accessibilityLabel="Now Playing"
        onPress={onSelectToday}
        pressedScale={0.94}
        style={styles.centerTab}
      >
        <Text
          variant="callout"
          numberOfLines={1}
          style={[styles.centerLabel, active === 'today' && styles.centerLabelActive]}
        >
          Now Playing
        </Text>
      </Touchable>

      {/* Right — "Tomorrow ›" pill button */}
      <Touchable
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'tomorrow' }}
        accessibilityLabel="Tomorrow"
        onPress={onSelectTomorrow}
        pressedScale={0.94}
        style={[styles.pillTab, active === 'tomorrow' && styles.pillTabActive]}
      >
        <Text
          variant="small"
          numberOfLines={1}
          style={[styles.pillLabel, active === 'tomorrow' && styles.pillLabelActive]}
        >
          Tomorrow
        </Text>
        <Ionicons
          name="chevron-forward"
          size={12}
          color={active === 'tomorrow' ? '#0A0A0C' : 'rgba(255,255,255,0.75)'}
        />
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },

  // ── Left: "Coming Soon" plain text ───────────────────────────────────────
  sideTab: {
    paddingVertical: 6,
    flexShrink: 1,
  },
  sideLabel: {
    color: 'rgba(255,255,255,0.45)',
  },
  sideLabelActive: {
    color: 'rgba(255,255,255,0.85)',
  },

  // ── Center: "Now Playing" active label ───────────────────────────────────
  centerTab: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  centerLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  centerLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── Right: "Tomorrow ›" pill ──────────────────────────────────────────────
  pillTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pillTabActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  pillLabel: {
    color: 'rgba(255,255,255,0.75)',
  },
  pillLabelActive: {
    color: '#0A0A0C',
  },
});

export const DayRail = memo(DayRailImpl);
