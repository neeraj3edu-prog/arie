import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallback() {
  const url = Linking.useURL();
  const router = useRouter();

  useEffect(() => {
    if (!url) return;

    async function exchange() {
      if (!url) return;

      // PKCE flow: planora://auth/callback?code=XXXX
      if (url.includes('code=')) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) router.replace('/(auth)/sign-in');
        // On success: onAuthStateChange fires → useProtectedRoute navigates to tasks
        return;
      }

      // Implicit flow: planora://auth/callback#access_token=XXXX&refresh_token=YYYY
      if (url.includes('access_token=')) {
        const hash = url.split('#')[1] ?? '';
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) router.replace('/(auth)/sign-in');
        }
        return;
      }

      // Unknown redirect — go back to sign-in
      router.replace('/(auth)/sign-in');
    }

    exchange();
  }, [url, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#4f6ef7" />
    </View>
  );
}
