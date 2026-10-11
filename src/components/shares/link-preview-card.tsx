import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openLink } from '@/lib/linkify';
import { useLinkPreview } from '@/queries/link-preview';

/**
 * The unfurled card under a message that links to another site — image,
 * site name, title, a line of description — tapping it opens the link the
 * same way tapping the link text does. Renders nothing until (and unless)
 * the page actually has something to show, so a link without preview tags
 * just stays a plain link.
 */
function LinkPreviewCardImpl({ url, sent }: { url: string; sent: boolean }) {
  const theme = useTheme();
  const { data: preview } = useLinkPreview(url);
  if (!preview) return null;

  return (
    <Touchable
      accessibilityRole="link"
      accessibilityLabel={`Open ${preview.title ?? preview.siteName}`}
      onPress={() => openLink(url)}
      pressedScale={0.98}
      style={[
        styles.card,
        { backgroundColor: sent ? theme.surfaceMuted : theme.surface, borderColor: theme.glassBorder },
      ]}>
      {preview.image ? (
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: preview.image }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
          {preview.video ? (
            <View style={styles.playWrap}>
              <View style={[styles.play, { backgroundColor: theme.scrim }]}>
                <Ionicons name="play" size={22} color="#FFFFFF" style={styles.playIcon} />
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={styles.body}>
        <View style={styles.site}>
          <View style={[styles.siteBar, { backgroundColor: theme.link }]} />
          <Text variant="caption" numberOfLines={1} style={[styles.siteName, { color: theme.link }]}>
            {preview.siteName}
          </Text>
        </View>
        {preview.title ? (
          <Text variant="small" numberOfLines={2} style={styles.title}>
            {preview.title}
          </Text>
        ) : null}
        {preview.description ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {preview.description}
          </Text>
        ) : null}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  // 16:9 — what YouTube thumbnails and most `og:image`s are cut for.
  imageWrap: { width: '100%', aspectRatio: 16 / 9 },
  playWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  play: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The play triangle's mass sits left of its box — nudged so it looks centered.
  playIcon: { marginLeft: 3 },
  body: { padding: Spacing.md, gap: 3 },
  site: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  siteBar: { width: 3, height: 12, borderRadius: 2 },
  siteName: { flex: 1, fontFamily: FontFamily.bold },
  title: { fontFamily: FontFamily.bold },
});

export const LinkPreviewCard = memo(LinkPreviewCardImpl);
