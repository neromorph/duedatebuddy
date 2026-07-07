import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// ponytail: expo-secure-store has no web implementation; use localStorage on web
const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const store = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) return window.localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) { window.localStorage.setItem(key, value); return; }
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (isWeb) { window.localStorage.removeItem(key); return; }
    if (typeof SecureStore.deleteItemAsync === 'function') {
      return SecureStore.deleteItemAsync(key);
    }
  },
};

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await store.setItem('session', JSON.stringify(session));
        logger.info('auth', 'Session restored from server');
      } else {
        logger.debug('auth', 'No active session');
      }
      set({ session, user: session?.user ?? null, isLoading: false });
    } catch (err) {
      logger.error('auth', 'Failed to initialize auth', undefined, err);
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await store.setItem('session', JSON.stringify(session));
        logger.info('auth', `Auth state change: ${_event}`);
      } else {
        await store.deleteItem('session');
        logger.debug('auth', `Auth state change: ${_event} (no session)`);
      }
      set({ session, user: session?.user ?? null });
    });
  },

  signIn: async (email: string, password: string) => {
    logger.debug('auth', 'Sign in attempt');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logger.warn('auth', `Sign in failed: ${error.message}`);
      return { error: 'Email atau password salah.' };
    }
    logger.info('auth', 'Sign in successful');
    return {};
  },

  signUp: async (email: string, password: string, fullName?: string) => {
    logger.debug('auth', 'Sign up attempt');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      logger.warn('auth', `Sign up failed: ${error.message}`);
      return { error: 'Gagal mendaftar. Silakan coba lagi.' };
    }
    logger.info('auth', 'Sign up successful');
    return {};
  },

  signOut: async () => {
    logger.debug('auth', 'Sign out');
    await supabase.auth.signOut().catch((err) => {
      logger.error('auth', 'Sign out supabase call failed', undefined, err);
    });
    await store.deleteItem('session');
    set({ session: null, user: null });
  },
}));
