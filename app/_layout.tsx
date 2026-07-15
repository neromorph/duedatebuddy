import React, { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as Font from 'expo-font';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/features/auth/useAuth';
import { COLORS } from '@/lib/theme';
import { getExpoPushToken } from '@/lib/notifications';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useReminderSweep } from '@/features/reminders/useReminderSweep';
import { logger } from '@/lib/logger';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading, initialize } = useAuth();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  useReminderSweep();

  useEffect(() => {
    let cancelled = false;
    async function loadFonts() {
      try {
        await Font.loadAsync({
          PlusJakartaSans: PlusJakartaSans_400Regular,
          PlusJakartaSans_500Medium: PlusJakartaSans_500Medium,
          PlusJakartaSans_600SemiBold: PlusJakartaSans_600SemiBold,
          PlusJakartaSans_700Bold: PlusJakartaSans_700Bold,
        });
      } catch (e) {
        logger.error('fonts', 'Font loading failed', undefined, e);
      }
      if (!cancelled) setFontsLoaded(true);
    }
    loadFonts();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    initialize().catch((e) => {
      logger.error('root', 'Auth init failed', undefined, e);
      setInitError(e instanceof Error ? e.message : 'Auth init failed');
    });
    getExpoPushToken()
      .then((token) => {
        if (token) logger.info('notifications', 'Expo push token ready', { suffix: token.slice(-8) });
      })
      .catch((e) => {
        logger.error(
          'root',
          'Push token registration failed',
          { error: e instanceof Error ? e.message : String(e) },
          e,
        );
      });
  }, []);

  // Safety timeout: auto-hide splash after 15s even if something hangs
  useEffect(() => {
    if (fontsLoaded && !isLoading) return;
    const timeout = setTimeout(() => {
      logger.warn('root', 'Splash screen safety timeout fired');
      SplashScreen.hideAsync().catch(() => {});
      setFontsLoaded(true);
    }, 15000);
    return () => clearTimeout(timeout);
  }, [fontsLoaded, isLoading]);

  useEffect(() => {
    if (!fontsLoaded || isLoading) return;
    SplashScreen.hideAsync().catch((e) => {
      logger.error('root', 'Failed to hide splash', undefined, e);
    });

    const inAuthGroup = segments[0] === '(auth)';
    const isResetPassword = String(segments[1]) === 'reset-password';
    const isVerified = String(segments[1]) === 'verified';

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup && !isResetPassword && !isVerified) {
      router.replace('/');
    }
  }, [session, fontsLoaded, isLoading, segments]);

  if (initError) {
    return (
      <View style={styles.splash}>
        <Text style={styles.errorText}>Terjadi kesalahan</Text>
        <Text style={styles.errorSubtext}>{initError}</Text>
      </View>
    );
  }

  if (!fontsLoaded || isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ErrorBoundary>
        <Slot />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.statusCritical,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
