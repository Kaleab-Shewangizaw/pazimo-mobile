import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Platform = 'ios' | 'android' | 'web' | 'unknown';

/** "iPhone 15 Pro", or a platform name when the install never reported its model. */
export function deviceName(platform: Platform, model: string | null): string {
  if (model) return model;
  if (platform === 'ios') return 'iPhone';
  if (platform === 'android') return 'Android phone';
  if (platform === 'web') return 'Web browser';
  return 'Unknown device';
}

const PLATFORM_ICON: Record<Platform, keyof typeof Ionicons.glyphMap> = {
  ios: 'logo-apple',
  android: 'logo-android',
  web: 'globe-outline',
  unknown: 'phone-portrait-outline',
};

/**
 * One device in a Telegram-style list — the account's Active sessions and the
 * wallet's phones. Tapping a row that isn't this device offers to remove it.
 */
function DeviceRowImpl({
  platform,
  title,
  subtitle,
  current,
  onPress,
}: {
  platform: Platform;
  title: string;
  subtitle: string;
  current?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();

  const content = (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: current ? theme.brand : theme.surfaceMuted }]}>
        <Ionicons name={PLATFORM_ICON[platform]} size={20} color={current ? theme.onBrand : theme.text} />
      </View>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text variant="body" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {current ? (
            <View style={[styles.badge, { backgroundColor: theme.brandTint }]}>
              <Text variant="caption" style={styles.badgeText}>
                This device
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="caption" color="textSecondary" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {onPress ? <Ionicons name="close-circle-outline" size={22} color={theme.danger} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Touchable accessibilityRole="button" accessibilityHint="Removes this device" onPress={onPress} pressedScale={0.99}>
      {content}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  icon: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { flexShrink: 1, fontFamily: FontFamily.bold },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 1, borderRadius: Radius.pill },
  badgeText: { fontFamily: FontFamily.bold },
});

export const DeviceRow = memo(DeviceRowImpl);
