import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { COLORS, SPACING, TYPOGRAPHY, RADII } from '@/lib/theme';
import { useAuth } from '@/features/auth/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, resetPassword, completeEmailConfirmation } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ponytail: confirmation emails deep-link to this screen with
  // access_token + refresh_token in the URL hash. Exchange them for a session;
  // onAuthStateChange will route the user to home.
  const confirmationUrl = Linking.useURL();
  useEffect(() => {
    if (!confirmationUrl || !confirmationUrl.includes('access_token')) return;
    completeEmailConfirmation(confirmationUrl).then((result) => {
      if (result.error) setError(result.error);
    });
  }, [confirmationUrl, completeEmailConfirmation]);

  const {
    control,
    handleSubmit,
    getValues,
    setError: setFieldError,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    const result = await signIn(data.email, data.password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    }
  };

  const onResetPassword = async () => {
    const email = getValues('email').trim();
    if (!z.string().email().safeParse(email).success) {
      setFieldError('email', { message: 'Isi email valid untuk reset kata sandi' });
      return;
    }

    setResetLoading(true);
    setError(null);
    setNotice(null);
    const result = await resetPassword(email, Linking.createURL('/reset-password'));
    setResetLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNotice('Email reset kata sandi sudah dikirim.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.form}>
            <View style={styles.brand}>
              <View style={styles.logo}>
                <View style={styles.orbit} />
              </View>
              <Text style={styles.title}>Masuk</Text>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
            {notice && <Text style={styles.noticeText}>{notice}</Text>}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  placeholder="nama@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Kata sandi"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Kata sandi"
                  secureTextEntry
                  error={errors.password?.message}
                />
              )}
            />

            <Button
              title={resetLoading ? 'Mengirim…' : 'Lupa kata sandi?'}
              onPress={onResetPassword}
              variant="text"
              disabled={resetLoading}
              style={styles.forgot}
            />

            <Button
              title="Masuk"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              style={styles.submit}
            />

            <Button
              title="Daftar"
              onPress={() => router.replace('/register')}
              variant="secondary"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  form: {
    gap: SPACING.md,
  },
  brand: {
    marginBottom: SPACING.lg,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.onSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  orbit: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 4,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  title: {
    ...TYPOGRAPHY.headline,
    color: COLORS.onSurface,
    fontSize: 38,
    lineHeight: 42,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.statusCritical,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  noticeText: {
    ...TYPOGRAPHY.body,
    color: COLORS.statusActive,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -SPACING.md,
  },
  submit: {
    marginTop: SPACING.sm,
  },
});
