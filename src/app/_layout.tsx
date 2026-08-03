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

import { loadAuthToken } from '@/api/client';
import { Colors } from '@/constants/theme';
import { queryClient } from '@/lib/query-client';

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

  useEffect(() => {
    if (!fontsReady) return;
    // Rehydrate the session before the first screen paints, so an authenticated
    // user never sees a signed-out flash.
    loadAuthToken().finally(() => SplashScreen.hideAsync());
  }, [fontsReady]);

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
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
