import { create } from 'zustand';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { AuthUser } from '@/lib/types';

type AuthStore = {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: (identityToken: string, nonce?: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/`
        : 'http://localhost:8082/';
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      return;
    }

    // Get the OAuth URL without opening a browser (skipBrowserRedirect: true)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'planora://auth/callback', skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) return;

    // Open in SFSafariViewController (in-app) instead of external Safari.
    // openAuthSessionAsync detects the planora:// redirect and closes the sheet automatically.
    const result = await WebBrowser.openAuthSessionAsync(data.url, 'planora://auth/callback');
    if (result.type !== 'success' || !result.url) return;

    // Exchange the auth code for a session directly — no deep link round-trip needed.
    if (result.url.includes('code=')) {
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (sessionError) throw sessionError;
    } else if (result.url.includes('access_token=')) {
      const hash = result.url.split('#')[1] ?? '';
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
        if (sessionError) throw sessionError;
      }
    }
  },

  signInWithApple: async (identityToken: string, nonce?: string) => {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
      nonce,
    });
    if (error) throw error;
  },

  deleteAccount: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Not signed in');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
    if (!res.ok) {
      const body = await res.json() as { error?: string };
      throw new Error(body.error ?? 'Failed to delete account');
    }

    _initDone = false;
    await supabase.auth.signOut();
    set({ user: null, session: null, loading: false });
  },

  signOut: async () => {
    _initDone = false;  // allow re-init after sign out
    await supabase.auth.signOut();
    set({ user: null, session: null, loading: false });
  },
}));
