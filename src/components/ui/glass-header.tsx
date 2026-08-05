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
  blurred = true,
}: {
  title: string;
  right?: ReactNode;
  /** Home only — replaces the text title with the wordmark. */
  showLogo?: boolean;
  /**
   * Set false where the page should read as one continuous surface: the bar
   * carries no material of its own and the feed passes under bare chrome.
   *
   * This also matters for whatever `right` holds. A glass control nested inside
   * a glass bar blurs *the bar*, not the page, so it flattens into a plain grey
   * disc instead of picking up what is behind the header.
   */
  blurred?: boolean;
}) {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={styles.row}>
      <View style={styles.titles}>
        {showLogo ? (
          // The source PNG is gold — tinting flattens it to a white logotype.
          <Image source={wordmark} style={styles.logo} contentFit="contain" tintColor="#FFFFFF" />
        ) : (
          <Text variant="heading" numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>
      {right}
    </View>
  );

  if (!blurred) {
    return <View style={[styles.container, { paddingTop: insets.top }]}>{content}</View>;
  }

  return (
    <Glass
      variant="regular"
      intensity={60}
      radius={0}
      bordered={false}
      style={[styles.container, { paddingTop: insets.top }]}>
      {content}
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
