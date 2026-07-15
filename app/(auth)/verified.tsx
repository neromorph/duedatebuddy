import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuth } from '@/features/auth/useAuth';
import Button from '@/components/ui/Button';
import { COLORS, SPACING, TYPOGRAPHY, RADII } from '@/lib/theme';

type State = 'verifying' | 'verified' | 'error';

export default function VerifiedScreen() {
  const router = useRouter();
  const { completeEmailConfirmation } = useAuth();
  const url = Linking.useURL();
  const [state, setState] = useState<State>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const consumed = useRef(false);

  useEffect(() => {
    if (!url || consumed.current) return;
    if (!url.includes('access_token')) {
      setState('error');
      setErrorMessage('Tautan tidak valid.');
      return;
    }
    consumed.current = true;
    completeEmailConfirmation(url)
      .then((result) => {
        if (result.error) {
          setState('error');
          setErrorMessage(result.error);
          return;
        }
        setState('verified');
        // ponytail: small delay so the user can read 'Email Terverifikasi'
        // before onAuthStateChange kicks them to home.
        setTimeout(() => router.replace('/'), 1200);
      })
      .catch(() => {
        setState('error');
        setErrorMessage('Tautan tidak valid atau sudah kedaluwarsa.');
      });
  }, [url, completeEmailConfirmation, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View
          style={styles.badge}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={styles.badgeInner} />
        </View>

        {state === 'verifying' && (
          <>
            <Text style={styles.title}>Memverifikasi email…</Text>
            <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
          </>
        )}

        {state === 'verified' && (
          <>
            <Text style={styles.title}>Email Terverifikasi</Text>
            <Text style={styles.subtitle}>Mengarahkan ke beranda…</Text>
          </>
        )}

        {state === 'error' && (
          <>
            <Text style={styles.title}>Verifikasi Gagal</Text>
            <Text style={styles.subtitle}>{errorMessage}</Text>
            <Button
              title="Kembali ke masuk"
              onPress={() => router.replace('/login')}
              style={styles.button}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: COLORS.onSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.onSurface,
    shadowOpacity: 0.15,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  badgeInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  title: {
    ...TYPOGRAPHY.headline,
    color: COLORS.onSurface,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    fontWeight: '800',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  spinner: {
    marginTop: SPACING.md,
  },
  button: {
    borderRadius: RADII.full,
    minHeight: 54,
    marginTop: SPACING.md,
    minWidth: 220,
  },
});
