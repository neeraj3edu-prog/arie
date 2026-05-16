import '../global.css';
import { useEffect, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { Slot, useRouter, useSegments, usePathname, router as expoRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { getDb } from '@/lib/db/client';
import { bootstrapFromSupabase } from '@/lib/sync/bootstrapSync';
import { useRegisterPushToken, useNotificationHandler } from '@/lib/hooks/useNotifications';

// Required for expo-web-browser auth sessions to complete on iOS
WebBrowser.maybeCompleteAuthSession();

// Native only — SplashScreen is a no-op on web
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 60_000 },
  },
});

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
const TAB_DEFS = [
  { name: 'tasks',    label: 'Tasks',    icon: 'calendar-outline' as IoniconName, activeIcon: 'calendar' as IoniconName, color: '#4f6ef7' },
  { name: 'expenses', label: 'Expenses', icon: 'card-outline'     as IoniconName, activeIcon: 'card'     as IoniconName, color: '#f7a24f' },
] as const;

function RootTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const showTabs = TAB_DEFS.some(t => (pathname ?? '').includes(t.name));
  if (!showTabs) return null;

  const screenWidth = Dimensions.get('window').width;
  const tabW = screenWidth / TAB_DEFS.length;
  return (
    <View style={{
      flexDirection: 'row',
      width: screenWidth,
      backgroundColor: '#0a0a0f',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.08)',
      paddingTop: 12,
      paddingBottom: Math.max(insets.bottom, 16),
    }}>
      {TAB_DEFS.map((tab) => {
        const isFocused = (pathname ?? '').includes(tab.name);
        return (
          <View key={tab.name} style={{ width: tabW, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Pressable
              onPress={() => expoRouter.navigate(`/(tabs)/${tab.name}`)}
              style={{ alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 4 }}
              accessible
              accessibilityRole="tab"
              accessibilityLabel={`${tab.label} tab`}
              accessibilityState={{ selected: isFocused }}
            >
              <Ionicons
                name={isFocused ? tab.activeIcon : tab.icon}
                size={26}
                color={isFocused ? tab.color : '#4a4a60'}
              />
              <Text style={{ fontSize: 11, fontWeight: '600', color: isFocused ? tab.color : '#4a4a60' }}>
                {tab.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function useProtectedRoute(user: unknown, loading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'auth';
    const onRootIndex = segments[0] === '(tabs)' && (segments[1] as string) === 'index';
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
  useRegisterPushToken();
  useNotificationHandler();


  useEffect(() => {
    async function boot() {
      if (Platform.OS !== 'web') await getDb();
      const unsub = await initialize();
      unsubRef.current = unsub ?? null;
      // Seed local DB from Supabase if this is a fresh install / reinstall
      if (Platform.OS !== 'web') {
        bootstrapFromSupabase().catch(() => {});
        SplashScreen.hideAsync().catch(() => {});
      }
    }
    boot();
    return () => { unsubRef.current?.(); };
  }, [initialize]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#4f6ef7" />
      </View>
    );
  }

  // Tab bar lives here at the root level — guaranteed full screen width
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <RootTabBar />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <AppShell />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
