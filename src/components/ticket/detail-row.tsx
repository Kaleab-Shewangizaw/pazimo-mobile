import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';

/**
 * One field on a ticket stub — venue, showtime, price. Was duplicated
 * verbatim between `ticket-view.tsx` and `cinema-ticket-view.tsx`; pulled out
 * once both needed the same restyle.
 *
 * The label reads as printed small-caps and the rule on the left is the
 * stub's own typographic furniture — the physical-ticket vocabulary of a
 * printed field label next to a hand-stamped value, not a settings row.
 */

function DetailRowImpl({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rule} />
      <Ionicons name={icon} size={13} color="rgba(255,255,255,0.55)" style={styles.icon} />
      <View style={styles.text}>
        <Text variant="caption" color="textSecondary" style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text variant="callout" style={styles.value} numberOfLines={3}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  rule: {
    width: 2,
    alignSelf: 'stretch',
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  icon: { marginTop: 3 },
  text: { flex: 1, gap: 1 },
  label: { textTransform: 'uppercase', letterSpacing: 1 },
  value: { letterSpacing: -0.2 },
});

export const DetailRow = memo(DetailRowImpl);
