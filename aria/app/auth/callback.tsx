import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { consumePendingOAuthUrl } from '@/lib/oauthUrl';

async function handleOAuthUrl(url: string, onError: () => void) {
  if (url.includes('code=')) {
    const { error } = await supabase.auth.exchangeCodeForSession(url);
    if (error) onError();
    return;
  }
  if (url.includes('access_token=')) {
    const hash = url.split('#')[1] ?? '';
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) onError();
    }
    return;
  }
  onError();
}

export default function AuthCallback() {
  const router = useRouter();
  const hookUrl = Linking.useURL();
  const [done, setDone] = useState(false);
  const user = useAuthStore((s) => s.user);

  // Already logged in (cached session) — skip straight to tasks
  useEffect(() => {
    if (user) router.replace('/(tabs)/tasks');
  }, [user, router]);

  // Fallback: if no OAuth URL arrives within 4 seconds, go to sign-in
  useEffect(() => {
    const t = setTimeout(() => {
      if (!done) router.replace('/(auth)/sign-in');
    }, 4000);
    return () => clearTimeout(t);
  }, [done, router]);

  // Exchange the OAuth code from the deep link
  useEffect(() => {
    if (done || user) return;
    const captured = consumePendingOAuthUrl();
    const url = captured ?? hookUrl;
    if (!url) return;
    setDone(true);
    handleOAuthUrl(url, () => router.replace('/(auth)/sign-in'));
  }, [hookUrl, done, user, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#4f6ef7" />
    </View>
  );
}
