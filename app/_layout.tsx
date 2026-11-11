import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CountryProvider } from '../src/features/country/CountryProvider';
import { RootNavigator } from '../src/navigation/RootNavigator';
import { useSessionStore } from '../src/store/session.store';
import { useBrandFonts } from '../src/theme/useFonts';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * TanStack Query owns everything the server owns.
 *
 * In production this client is persisted to MMKV so a cold start on a Kingston
 * bus shows the last trip rather than a spinner, and so paused mutations
 * (hazard reports, evidence photos captured in a dead zone) survive a kill and
 * resume on reconnect.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { fontsLoaded, fontError } = useBrandFonts();
  const isHydrating = useSessionStore((s) => s.isHydrating);
  const finishHydrating = useSessionStore((s) => s.finishHydrating);

  // Stands in for restoring a persisted session. Real implementation reads
  // Supabase auth state here.
  useEffect(() => {
    if (isHydrating) finishHydrating();
  }, [isHydrating, finishHydrating]);

  const ready = (fontsLoaded || !!fontError) && !isHydrating;

  /**
   * Hold the splash until fonts, session AND country config have all settled.
   * Route guards evaluate before an async gate resolves otherwise, and a flash
   * of the wrong persona's tab bar is the first thing a store reviewer sees.
   */
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <CountryProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </SafeAreaProvider>
      </CountryProvider>
    </QueryClientProvider>
  );
}
