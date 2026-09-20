import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The initial-circle recipe already duplicated inline in `profile.tsx` and
 * `event/[id].tsx`, pulled into one component because the share feature needs
 * it in three more places (recipient rows, contact rows, history rows).
 * Pass `imageUri` (already resolved via `resolveImageUrl`) to show a photo
 * instead — the initial only renders when there's no image.
 */
function AvatarInitialsImpl({
  name,
  size = 44,
  imageUri,
}: {
  name: string;
  size?: number;
  imageUri?: string | null;
}) {
  const theme = useTheme();
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: Radius.pill, borderColor: theme.glassBorder },
      ]}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={[StyleSheet.absoluteFill, { borderRadius: Radius.pill }]}
          contentFit="cover"
        />
      ) : (
        <Text variant="callout" style={styles.initial}>
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  initial: { color: '#FFFFFF' },
});

export const AvatarInitials = memo(AvatarInitialsImpl);
