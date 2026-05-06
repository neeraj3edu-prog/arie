import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!code) return;
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) router.replace('/(auth)/sign-in');
      // On success onAuthStateChange fires → useProtectedRoute redirects to /(tabs)/tasks
    });
  }, [code, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#4f6ef7" />
    </View>
  );
}
