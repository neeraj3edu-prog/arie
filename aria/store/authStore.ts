import { create } from 'zustand';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { AuthUser } from '@/lib/types';

// Required for expo-web-browser OAuth session completion on iOS
WebBrowser.maybeCompleteAuthSession();

type AuthStore = {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: (identityToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<() => void>;  // returns unsubscribe fn
};

function supabaseUserToAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: user.user_metadata?.['full_name'] as string | null ?? null,
    avatarUrl: user.user_metadata?.['avatar_url'] as string | null ?? null,
    timezone: 'UTC',
    currency: 'USD',
    onboarded: false,
  };
}

let _initDone = false;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: async () => {
    // Guard: only run once across Strict Mode double-invoke
    if (_initDone) return () => {};
    _initDone = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({
        session,
        user: session?.user ? supabaseUserToAuthUser(session.user) : null,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        set({
          session: newSession,
          user: newSession?.user ? supabaseUserToAuthUser(newSession.user) : null,
          loading: false,
        });
      }
    );

    return () => subscription.unsubscribe();
  },

  signInWithGoogle: async () => {
    if (Platform.OS === 'web') {
      // Web: Supabase handles the redirect automatically
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/`
        : 'http://localhost:8082/';
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      return;
    }

    // Native: use expo-web-browser to keep the session alive through the redirect
    const redirectTo = 'planora://auth/callback';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) return;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') {
      // Exchange the auth code in the redirect URL for a real session
      await supabase.auth.exchangeCodeForSession(result.url);
    }
  },

  signInWithApple: async (identityToken: string) => {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
    });
    if (error) throw error;
  },

  signOut: async () => {
    _initDone = false;  // allow re-init after sign out
    await supabase.auth.signOut();
    set({ user: null, session: null, loading: false });
  },
}));
