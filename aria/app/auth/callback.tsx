import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase/client';
import { consumePendingOAuthUrl } from '@/lib/oauthUrl';

async function handleOAuthUrl(url: string, onError: () => void) {
  // PKCE flow: ?code=XXXX
  if (url.includes('code=')) {
    const { error } = await supabase.auth.exchangeCodeForSession(url);
    if (error) onError();
    return;
  }
  // Implicit flow: #access_token=XXXX
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

  useEffect(() => {
    if (done) return;

    // Primary: URL captured early in _layout.tsx before this screen mounted
    const captured = consumePendingOAuthUrl();
    const url = captured ?? hookUrl;
    if (!url) return;

    setDone(true);
    handleOAuthUrl(url, () => router.replace('/(auth)/sign-in'));
    // On success: onAuthStateChange fires → useProtectedRoute navigates to /(tabs)/tasks
  }, [hookUrl, done, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#4f6ef7" />
    </View>
  );
}
