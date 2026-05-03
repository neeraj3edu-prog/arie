import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function SignInScreen() {
  const router = useRouter();
  const { signInWithGoogle, signInWithApple } = useAuthStore();
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApple() {
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // credential.identityToken is guaranteed non-null when signInAsync succeeds
      await signInWithApple(credential.identityToken!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
      router.replace('/(tabs)/tasks');
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-bg justify-center items-center px-8">
      <View className="items-center mb-16">
        <View className="w-20 h-20 bg-tasks rounded-3xl items-center justify-center mb-6">
          <Ionicons name="mic" size={40} color="#fff" />
        </View>
        <Text className="text-text-primary text-4xl font-bold tracking-tight">Planora</Text>
        <Text className="text-text-secondary text-base mt-2 text-center">
          Voice-first tasks & expenses
        </Text>
      </View>

      <View className="w-full gap-3">
        <Pressable
          className="w-full bg-surface border border-border-strong rounded-2xl py-4 flex-row items-center justify-center gap-3 active:opacity-75"
          onPress={handleGoogle}
          disabled={loading}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Sign in with Google"
        >
          <Ionicons name="logo-google" size={20} color="#f0f0f5" />
          <Text className="text-text-primary text-base font-semibold">Continue with Google</Text>
        </Pressable>

        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={16}
          style={{ width: '100%', height: 56 }}
          onPress={handleApple}
        />
      </View>

      {loading && (
        <ActivityIndicator
          size="large"
          color="#4f6ef7"
          className="mt-8"
        />
      )}

      <Text className="text-text-muted text-xs mt-12 text-center">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </View>
  );
}
