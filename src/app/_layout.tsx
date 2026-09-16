import '@/global.css';

import {
  ComicRelief_400Regular,
  ComicRelief_700Bold,
  useFonts,
} from '@expo-google-fonts/comic-relief';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { PushNotificationsBridge } from '@/hooks/use-push-notifications';
import { ShareTransferSocketBridge } from '@/hooks/use-share-transfer-socket';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/use-auth-store';

SplashScreen.preventAutoHideAsync();

const rootStyle = { flex: 1 } as const;
const theme = Colors.dark;

// The app is dark-only, so navigation chrome is built once from DarkTheme
// rather than switched at runtime.
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.background,
    card: theme.backgroundElevated,
    primary: theme.brand,
    text: theme.text,
    border: theme.hairline,
  },
};

export default function RootLayout() {
  // `fontError` releases the gate too — a failed download falls back to the
  // system font rather than trapping the app on the splash screen.
  const [fontsLoaded, fontError] = useFonts({
    ComicRelief_400Regular,
    ComicRelief_700Bold,
  });
  const fontsReady = fontsLoaded || fontError != null;
  const hydrate = useAuthStore((s) => s.hydrate);

  // React Query's `refetchOnWindowFocus` has nothing to listen to on native —
  // there is no browser window — so without this, a query that goes stale
  // while the app sits backgrounded (the cinema screen's "today" bucket is
  // the sharpest case: correct at 11pm, wrong by the time someone reopens the
  // app at 9am) never gets a trigger to refetch on. This is what gives it one.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!fontsReady) return;
    // Rehydrate the session before the first screen paints, so an authenticated
    // user never sees a signed-out flash — and so the first request out of the
    // app already carries the bearer token.
    hydrate().finally(() => SplashScreen.hideAsync());
  }, [fontsReady, hydrate]);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={rootStyle}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="light" />
          <ShareTransferSocketBridge />
          <PushNotificationsBridge />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.background },
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="event/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="ticket/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="movie/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="shares" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="account/menu" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="account/edit" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="account/wishlist" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="account/contacts" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="account/blocked" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="account/notifications" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="account/terms" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="account/support" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="conversation/[userId]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="refill/event/[eventId]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="refill/venue/[venueId]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="refill/orders" options={{ animation: 'slide_from_right' }} />
            {/* Fades rather than slides, and cannot be swiped away: the poll
                running on this screen is what issues the ticket, so leaving it
                by accident mid-payment has a real cost. */}
            <Stack.Screen
              name="checkout/[txn]"
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen
              name="cinema/[showtimeId]/seats"
              options={{ animation: 'slide_from_right' }}
            />
            {/* Same reasoning as checkout/[txn]: the poll here is what settles the order. */}
            <Stack.Screen
              name="cinema-order/[txn]"
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen
              name="refill/order/[txn]"
              options={{ animation: 'fade', gestureEnabled: false }}
            />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
