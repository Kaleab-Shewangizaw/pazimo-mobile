import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Glass } from '@/components/ui/glass';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const FADE = { useNativeDriver: true, duration: 180 } as const;
const SPRING = { useNativeDriver: true, speed: 20, bounciness: 6 } as const;

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Reddens the confirm button — use for actions that can't be casually undone. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * A centred, app-styled yes/no prompt — the counterpart to `BottomSheet` for
 * a question rather than a form. Exists because RN's `Alert.alert` is a
 * no-op on web (it neither shows anything nor calls back), so anything
 * gated on "did they confirm?" silently never happened there.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();

  // Kept mounted through the close animation, same reasoning as BottomSheet.
  const [mounted, setMounted] = useState(visible);
  const [backdrop] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.94));

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- must be mounted before the open animation can run; mirrors BottomSheet's identical case.
      setMounted(true);
    }

    const backdropAnim = Animated.timing(backdrop, { toValue: visible ? 1 : 0, ...FADE });
    const scaleAnim = Animated.spring(scale, { toValue: visible ? 1 : 0.94, ...SPRING });

    if (visible) {
      backdropAnim.start();
    } else {
      backdropAnim.start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    scaleAnim.start();

    return () => {
      backdropAnim.stop();
      scaleAnim.stop();
    };
  }, [visible, backdrop, scale]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onCancel}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Dismiss" />
      </Animated.View>

      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="box-none">
        <Animated.View style={{ transform: [{ scale }], opacity: backdrop, width: '100%' }}>
          <Glass variant="regular" intensity={80} radius={Radius.xl} style={styles.card}>
            <View style={styles.content}>
              <Text variant="title" style={styles.centered}>
                {title}
              </Text>
              {message ? (
                <Text variant="small" color="textSecondary" style={styles.centered}>
                  {message}
                </Text>
              ) : null}

              <View style={styles.actions}>
                <Button
                  label={cancelLabel}
                  variant="secondary"
                  style={styles.actionButton}
                  onPress={onCancel}
                />
                <Button
                  label={confirmLabel}
                  variant="primary"
                  style={[styles.actionButton, destructive ? { backgroundColor: theme.danger } : null]}
                  textStyle={destructive ? styles.destructiveText : undefined}
                  onPress={onConfirm}
                />
              </View>
            </View>
          </Glass>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(2,2,3,0.6)' },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: { width: '100%', maxWidth: 340, alignSelf: 'center' },
  content: { padding: Spacing.xl, gap: Spacing.lg },
  centered: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionButton: { flex: 1 },
  destructiveText: { color: '#FFFFFF' },
});
