import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CONSENT_KEY = 'ai_data_consent_v1';

export type ConsentState = {
  hasConsent: boolean | null; // null = loading
  grantConsent: () => Promise<void>;
};

export function useAIConsent(): ConsentState {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        if (Platform.OS === 'web') {
          setHasConsent(localStorage.getItem(CONSENT_KEY) === 'true');
        } else {
          const val = await SecureStore.getItemAsync(CONSENT_KEY);
          setHasConsent(val === 'true');
        }
      } catch {
        setHasConsent(false);
      }
    }
    load();
  }, []);

  async function grantConsent(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(CONSENT_KEY, 'true');
    } else {
      await SecureStore.setItemAsync(CONSENT_KEY, 'true');
    }
    setHasConsent(true);
  }

  return { hasConsent, grantConsent };
}
