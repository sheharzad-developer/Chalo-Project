import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigError } from '../lib/supabase';

type Role = 'rider' | 'driver';

type AuthState = {
  session: Session | null;
  loading: boolean;
  init: () => () => void;
  signUp: (email: string, password: string, full_name: string, role: Role) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  session: null,
  loading: true,

  init: () => {
    if (supabaseConfigError) {
      set({ session: null, loading: false });
      return () => {};
    }
    supabase.auth
      .getSession()
      .then(({ data }) => {
        set({ session: data.session, loading: false });
      })
      .catch(() => {
        set({ session: null, loading: false });
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });
    return () => sub.subscription.unsubscribe();
  },

  signUp: async (email, password, full_name, role) => {
    if (supabaseConfigError) return { error: supabaseConfigError };
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name, role } },
      });
      return { error: error?.message };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unable to sign up.' };
    }
  },

  signIn: async (email, password) => {
    if (supabaseConfigError) return { error: supabaseConfigError };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unable to sign in.' };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
