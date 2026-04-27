import '../global.css';
import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/store/authStore';
import { getDb } from '@/lib/db/client';

// Native only — SplashScreen is a no-op on web
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 60_000 },
  },
});

function useProtectedRoute(user: unknown, loading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onRootIndex = segments[0] === '(tabs)' && segments[1] === 'index';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (user && (inAuthGroup || onRootIndex)) {
      router.replace('/(tabs)/tasks');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);
}

function AppShell() {
  const { user, loading, initialize } = useAuthStore();
  const unsubRef = useRef<(() => void) | null>(null);

  useProtectedRoute(user, loading);

  useEffect(() => {
    async function boot() {
      if (Platform.OS !== 'web') await getDb();
      const unsub = await initialize();
      unsubRef.current = unsub ?? null;
      if (Platform.OS !== 'web') {
        SplashScreen.hideAsync().catch(() => {});
      }
    }
    boot();
    return () => { unsubRef.current?.(); };
  }, [initialize]);

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator size="large" color="#4f6ef7" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <AppShell />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
