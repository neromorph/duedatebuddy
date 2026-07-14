import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
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
  resetPassword: (email: string, redirectTo: string) => Promise<{ error?: string }>;
  startPasswordRecovery: (url: string) => Promise<{ error?: string; recovered?: boolean }>;
  completeEmailConfirmation: (url: string) => Promise<{ error?: string; confirmed?: boolean }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
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
      options: {
        data: { full_name: fullName },
        // ponytail: Linking.createURL resolves to the right scheme in dev (exp://)
        // and prod (duedatebuddy://) without us hardcoding either. Hardcoded
        // schemes break Expo Go / dev builds where the app is served from Metro.
        emailRedirectTo: Linking.createURL('/login'),
      },
    });
    if (error) {
      logger.warn('auth', `Sign up failed: ${error.message}`);
      return { error: 'Gagal mendaftar. Silakan coba lagi.' };
    }
    logger.info('auth', 'Sign up successful');
    return {};
  },

  resetPassword: async (email: string, redirectTo: string) => {
    logger.debug('auth', 'Password recovery requested');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      logger.warn('auth', `Password recovery failed: ${error.message}`);
      return { error: 'Gagal mengirim email reset. Silakan coba lagi.' };
    }
    logger.info('auth', 'Password recovery email sent');
    return {};
  },

  startPasswordRecovery: async (url: string) => {
    const params = new URLSearchParams(url.split('#')[1] ?? url.split('?')[1] ?? '');
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return { recovered: false };

    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      logger.warn('auth', `Password recovery session failed: ${error.message}`);
      return { error: 'Tautan reset tidak valid atau sudah kedaluwarsa.' };
    }
    logger.info('auth', 'Password recovery session started');
    return { recovered: true };
  },

  // ponytail: confirmation emails (and other PKCE redirects) land on the login
  // screen with access_token + refresh_token in the URL hash. We exchange them
  // for a session; onAuthStateChange then routes the user to home.
  completeEmailConfirmation: async (url: string) => {
    const params = new URLSearchParams(url.split('#')[1] ?? url.split('?')[1] ?? '');
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return { confirmed: false };
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      logger.warn('auth', `Email confirmation session failed: ${error.message}`);
      return { error: 'Tautan konfirmasi tidak valid atau sudah kedaluwarsa.' };
    }
    logger.info('auth', 'Email confirmation session started');
    return { confirmed: true };
  },

  updatePassword: async (password: string) => {
    logger.debug('auth', 'Password update requested');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      logger.warn('auth', `Password update failed: ${error.message}`);
      return { error: 'Gagal menyimpan kata sandi baru. Buka ulang tautan reset.' };
    }
    logger.info('auth', 'Password updated');
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
