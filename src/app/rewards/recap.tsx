import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PixelRatio,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BirthDateSheet } from '@/components/rewards/birth-date-sheet';
import { CARD_ASPECT, RecapCard } from '@/components/rewards/recap-card';
import { Button } from '@/components/ui/button';
import { Touchable } from '@/components/ui/pressable';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { currentPeriodKey, periodLabel, shiftPeriodKey } from '@/lib/rewards';
import { queryKeys } from '@/queries/keys';
import { useRecap } from '@/queries/rewards';
import type { RecapCard as RecapCardData, RecapPeriodType } from '@/types/api';

// Story size. view-shot's width/height are logical pixels, so divide by the
// screen's density to land on exactly 1080×1920 real pixels.
const EXPORT = { width: 1080, height: 1920 };

const TOP_BAR = 104;
const BOTTOM_BAR = 120;

/**
 * The shareable recap: a deck of story-sized cards the admin designed,
 * filled with this person's month or year. Swipe through; Share hands the
 * current card to the system share sheet (TikTok, Instagram, WhatsApp, ...)
 * as a 1080×1920 PNG, Save drops it into Photos.
 */
export default function RecapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const goBack = useGoBack();
  const queryClient = useQueryClient();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const params = useLocalSearchParams<{ period?: string; key?: string }>();

  const [period, setPeriod] = useState<RecapPeriodType>(params.period === 'year' ? 'year' : 'month');
  const [key, setKey] = useState(params.key || currentPeriodKey(period));
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [birthDateVisible, setBirthDateVisible] = useState(false);

  const recap = useRecap(period, key);
  const cards = useMemo(() => recap.data?.cards ?? [], [recap.data]);
  const cardRefs = useRef<Record<string, View | null>>({});
  const listRef = useRef<FlatList<RecapCardData>>(null);

  const deckHeight = screenHeight - insets.top - insets.bottom - TOP_BAR - BOTTOM_BAR;
  const cardWidth = Math.min(screenWidth - Spacing.xxl * 2, deckHeight * CARD_ASPECT);

  const switchPeriod = useCallback((next: RecapPeriodType) => {
    setPeriod(next);
    setKey(currentPeriodKey(next));
    setIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  const step = useCallback(
    (by: number) => {
      const next = shiftPeriodKey(period, key, by);
      if (!next) return;
      setKey(next);
      setIndex(0);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    },
    [key, period],
  );

  // Pages are exactly one screen wide, so where the swipe settled is the index.
  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setIndex(Math.round(event.nativeEvent.contentOffset.x / screenWidth));
    },
    [screenWidth],
  );

  const capture = useCallback(async () => {
    const card = cards[index];
    const view = card ? cardRefs.current[card.id] : null;
    if (!view) return null;
    const ratio = PixelRatio.get();
    return captureRef(view, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: EXPORT.width / ratio,
      height: EXPORT.height / ratio,
      fileName: `pazimo-recap-${key}-${index + 1}`,
    });
  }, [cards, index, key]);

  const share = useCallback(async () => {
    setBusy('share');
    try {
      const uri = await capture();
      if (!uri) return;
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'Save the card to your photos and post it from there.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: 'Share your Pazimo recap',
      });
    } catch {
      Alert.alert('Could not share', 'Something went wrong making that card. Try again.');
    } finally {
      setBusy(null);
    }
  }, [capture]);

  const save = useCallback(async () => {
    setBusy('save');
    try {
      const { granted } = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
      if (!granted) {
        Alert.alert('Photos access needed', 'Allow Pazimo to add photos in Settings to save your cards.');
        return;
      }
      const uri = await capture();
      if (!uri) return;
      await MediaLibrary.Asset.create(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Saved', 'Your card is in your photos.');
    } catch {
      Alert.alert('Could not save', 'Something went wrong saving that card. Try again.');
    } finally {
      setBusy(null);
    }
  }, [capture]);

  const onBirthDateSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.rewards.all });
  }, [queryClient]);

  const renderItem = useCallback(
    ({ item }: { item: RecapCardData }) => (
      <View style={[styles.page, { width: screenWidth }]}>
        <RecapCard
          ref={(view) => {
            cardRefs.current[item.id] = view;
          }}
          card={item}
          width={cardWidth}
          periodLabel={periodLabel(period, key)}
        />
      </View>
    ),
    [cardWidth, key, period, screenWidth],
  );

  const canGoForward = shiftPeriodKey(period, key, 1) !== null;
  const ready = !recap.isLoading && !recap.isError && cards.length > 0;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#0B0B10', '#141020', '#08080A']} style={StyleSheet.absoluteFill} />

      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm, height: insets.top + TOP_BAR }]}>
        <View style={styles.topRow}>
          <Touchable accessibilityRole="button" accessibilityLabel="Close" onPress={goBack} pressedScale={0.9} style={styles.iconButton}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Touchable>
          <View style={styles.segment}>
            {(['month', 'year'] as const).map((p) => (
              <Touchable
                key={p}
                accessibilityRole="button"
                accessibilityState={{ selected: period === p }}
                onPress={() => switchPeriod(p)}
                style={[styles.segmentItem, period === p && styles.segmentActive]}>
                <Text variant="small" style={[styles.segmentText, period === p && styles.segmentTextActive]}>
                  {p === 'month' ? 'Monthly' : 'Yearly'}
                </Text>
              </Touchable>
            ))}
          </View>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.periodRow}>
          <Touchable accessibilityRole="button" accessibilityLabel="Previous" onPress={() => step(-1)} pressedScale={0.9} style={styles.chevron}>
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          </Touchable>
          <Text variant="body" style={styles.periodText}>
            {periodLabel(period, key)}
          </Text>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Next"
            disabled={!canGoForward}
            onPress={() => step(1)}
            pressedScale={0.9}
            style={[styles.chevron, !canGoForward && styles.disabled]}>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </Touchable>
        </View>

        {ready && cards.length > 1 ? (
          <View style={[styles.dots, { width: cardWidth }]}>
            {cards.map((card, i) => (
              <View key={card.id} style={[styles.dot, { opacity: i === index ? 1 : 0.3 }]} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.deck}>
        {recap.isLoading ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : recap.isError ? (
          <ErrorState onRetry={() => recap.refetch()} />
        ) : cards.length === 0 ? (
          <EmptyState
            icon="albums-outline"
            title={`Nothing to recap for ${periodLabel(period, key)}`}
            message="Buy tickets and drinks in the app and your recap fills itself in."
          />
        ) : (
          <FlatList
            ref={listRef}
            data={cards}
            keyExtractor={(card) => card.id}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            getItemLayout={(_, i) => ({ length: screenWidth, offset: screenWidth * i, index: i })}
          />
        )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md, height: insets.bottom + BOTTOM_BAR }]}>
        {recap.data?.drinkGate === 'birthdate-required' ? (
          <Touchable accessibilityRole="button" onPress={() => setBirthDateVisible(true)} style={styles.gate}>
            <Ionicons name="gift-outline" size={16} color="#FFD166" />
            <Text variant="caption" style={styles.gateText}>
              Add your birthday to unlock your drink stats
            </Text>
          </Touchable>
        ) : null}
        {ready ? (
          <View style={styles.actions}>
            <Button
              label="Save"
              variant="secondary"
              size="lg"
              loading={busy === 'save'}
              disabled={busy !== null}
              icon={<Ionicons name="download-outline" size={18} color="#FFFFFF" />}
              onPress={save}
              style={styles.action}
            />
            <Button
              label="Share"
              size="lg"
              loading={busy === 'share'}
              disabled={busy !== null}
              icon={<Ionicons name="share-social" size={18} color="#0A0A0B" />}
              onPress={share}
              style={styles.action}
            />
          </View>
        ) : (
          <Button label="Back to rewards" variant="ghost" onPress={() => (router.canGoBack() ? goBack() : router.replace('/rewards'))} />
        )}
      </View>

      <BirthDateSheet visible={birthDateVisible} onClose={() => setBirthDateVisible(false)} onSaved={onBirthDateSaved} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08080A' },
  disabled: { opacity: 0.3 },

  topBar: { alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.pill, padding: 3 },
  segmentItem: { paddingHorizontal: Spacing.lg, paddingVertical: 6, borderRadius: Radius.pill },
  segmentActive: { backgroundColor: '#FFFFFF' },
  segmentText: { color: 'rgba(255,255,255,0.7)', fontFamily: FontFamily.bold },
  segmentTextActive: { color: '#0A0A0B' },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  periodText: { color: '#FFFFFF', fontFamily: FontFamily.bold, minWidth: 130, textAlign: 'center' },
  chevron: { padding: Spacing.xs },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#FFFFFF' },

  deck: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { alignItems: 'center', justifyContent: 'center' },

  bottomBar: { justifyContent: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  actions: { flexDirection: 'row', gap: Spacing.md },
  action: { flex: 1 },
  gate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,209,102,0.12)',
  },
  gateText: { color: '#FFD166' },
});
