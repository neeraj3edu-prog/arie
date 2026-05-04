import { create } from 'zustand';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { AuthUser } from '@/lib/types';

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
    const redirectTo = Platform.OS === 'web'
      ? (typeof window !== 'undefined' ? `${window.location.origin}/` : 'http://localhost:8082/')
      : 'planora://auth/callback';
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
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
