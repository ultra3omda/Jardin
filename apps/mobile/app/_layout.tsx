import '../global.css';
import '../lib/i18n'; // initialise i18next au démarrage
import { useEffect, useMemo } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, buildTheme } from '@klasso/ui-mobile';
import { useTenantStore } from '@/lib/tenant/store';

// Keep the splash up until the brand fonts are ready (or fail) so headings
// never flash in the fallback face first.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* no-op: splash may already be hidden */
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 5 * 60 * 1000 },
  },
});

export default function RootLayout() {
  // V7 brand typography — Fraunces (display) + Public Sans (body). The keys
  // here are the family names referenced by the `fonts` design token.
  const [fontsLoaded, fontError] = useFonts({
    'Fraunces-SemiBold': require('../assets/fonts/Fraunces-SemiBold.ttf'),
    'Fraunces-Bold': require('../assets/fonts/Fraunces-Bold.ttf'),
    'PublicSans-Regular': require('../assets/fonts/PublicSans-Regular.ttf'),
    'PublicSans-Medium': require('../assets/fonts/PublicSans-Medium.ttf'),
    'PublicSans-SemiBold': require('../assets/fonts/PublicSans-SemiBold.ttf'),
    'PublicSans-Bold': require('../assets/fonts/PublicSans-Bold.ttf'),
  });

  useEffect(() => {
    // Hide the splash once fonts resolve — OR on error, so a font failure can
    // never strand the app on the splash (text just falls back to system).
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null; // splash stays visible
  }

  return (
    // SafeAreaProvider exposes device insets (notch / Dynamic Island / home
    // indicator) so screens can avoid being clipped — see the per-group layouts.
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemedApp />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Applies the connected establishment's brand colour (white-label) on top of
 * the default Médina palette. Reads the tenant store reactively so the accent
 * updates as soon as a school is selected; falls back to Médina pre-auth or
 * when the tenant has no custom brand.
 */
function ThemedApp() {
  const primary = useTenantStore((s) => s.brand?.primaryColor);
  const theme = useMemo(() => buildTheme(primary), [primary]);
  return (
    <ThemeProvider value={theme}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
