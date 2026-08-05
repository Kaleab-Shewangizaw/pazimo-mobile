import '@/global.css';

import {
  ComicRelief_400Regular,
  ComicRelief_700Bold,
  useFonts,
} from '@expo-google-fonts/comic-relief';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
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
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.background },
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="event/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="ticket/[id]" options={{ animation: 'slide_from_right' }} />
            {/* Fades rather than slides, and cannot be swiped away: the poll
                running on this screen is what issues the ticket, so leaving it
                by accident mid-payment has a real cost. */}
            <Stack.Screen
              name="checkout/[txn]"
              options={{ animation: 'fade', gestureEnabled: false }}
            />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
