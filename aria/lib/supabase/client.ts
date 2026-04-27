import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

// SecureStore is native-only; fall back to localStorage on web (dev only)
const storage =
  Platform.OS === 'web'
    ? {
        getItem: (key: string): Promise<string | null> =>
          Promise.resolve(
            typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
          ),
        setItem: (key: string, value: string): Promise<void> => {
          if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string): Promise<void> => {
          if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
          return Promise.resolve();
        },
      }
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    // On web, Supabase must parse the #access_token hash from the OAuth callback URL.
    // On native, Expo Router handles deep links — URL parsing would break navigation.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
