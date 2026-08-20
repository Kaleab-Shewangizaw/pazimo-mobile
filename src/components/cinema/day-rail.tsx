import { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import type { DayKey, DaySegment } from '@/lib/programme';

/**
 * Now Playing / Tomorrow / Coming Soon.
 *
 * Every segment stays visible and tappable even when it holds nothing — an
 * empty "Tomorrow" is information ("they haven't posted tomorrow yet"), whereas
 * hiding it would read as a missing feature. The count rides along so the state
 * is legible before you commit a tap.
 */

export type DayRailProps = {
  segments: DaySegment[];
  active: DayKey;
  onSelect: (key: DayKey) => void;
};

function DayRailImpl({ segments, active, onSelect }: DayRailProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {segments.map((segment) => {
        const on = segment.key === active;
        const empty = segment.entries.length === 0;

        return (
          <Touchable
            key={segment.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${segment.label}, ${segment.entries.length} films`}
            onPress={() => onSelect(segment.key)}
            pressedScale={0.94}
            style={[styles.tab, on && styles.tabOn]}
          >
            <Text
              variant="small"
              style={[styles.label, on && styles.labelOn, !on && empty && styles.labelEmpty]}
            >
              {segment.label}
            </Text>
            {!empty ? (
              <View style={[styles.count, on && styles.countOn]}>
                <Text variant="caption" style={[styles.countText, on && styles.countTextOn]}>
                  {segment.entries.length}
                </Text>
              </View>
            ) : null}
          </Touchable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { gap: Spacing.xs, paddingHorizontal: Spacing.lg, alignItems: 'center' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  tabOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },

  label: { color: 'rgba(255,255,255,0.82)' },
  labelOn: { color: '#0A0A0C' },
  // Dimmed rather than removed: an empty day is a fact worth showing.
  labelEmpty: { color: 'rgba(255,255,255,0.42)' },

  count: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
  },
  countOn: { backgroundColor: 'rgba(10,10,12,0.12)' },
  countText: { color: 'rgba(255,255,255,0.9)' },
  countTextOn: { color: '#0A0A0C' },
});

export const DayRail = memo(DayRailImpl);
