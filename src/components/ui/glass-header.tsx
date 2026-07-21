import { Image } from 'expo-image';
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

const wordmark = require('@/assets/images/pazimo-logo.png');

function GlassHeaderImpl({
  title,
  right,
  showLogo = false,
}: {
  title: string;
  right?: ReactNode;
  /** Home only — replaces the text title with the gold wordmark. */
  showLogo?: boolean;
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
          {showLogo ? (
            <Image source={wordmark} style={styles.logo} contentFit="contain" />
          ) : (
            <Text variant="heading" numberOfLines={1}>
              {title}
            </Text>
          )}
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
  logo: { width: 108, height: 26, alignSelf: 'flex-start' },
});

export const GlassHeader = memo(GlassHeaderImpl);
