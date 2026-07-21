import { type ReactNode, memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/ui/glass';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';

/**
 * Floats over the scroll content so the feed passes under it. Screens must add
 * `headerHeight` worth of top padding to their scroll content.
 */
export const HEADER_CONTENT_HEIGHT = 52;

function GlassHeaderImpl({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Glass
      variant="regular"
      intensity={60}
      radius={0}
      bordered={false}
      style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.titles}>
          <Text variant="heading" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="small" color="textSecondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  row: {
    height: HEADER_CONTENT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  titles: { flex: 1 },
});

export const GlassHeader = memo(GlassHeaderImpl);
