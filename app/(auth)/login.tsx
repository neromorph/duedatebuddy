import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
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
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError(null);
    const result = await signIn(data.email, data.password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={styles.appName}>DueDateBuddy</Text>
            <Text style={styles.tagline}>Kelola tenggat waktumu dengan mudah</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Masuk</Text>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  placeholder="contoh@email.com"
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
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Masukkan password"
                  secureTextEntry
                  error={errors.password?.message}
                />
              )}
            />

            <Button
              title="Masuk"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              style={styles.submit}
            />

            <Button
              title="Belum punya akun? Daftar"
              onPress={() => router.replace('/register')}
              variant="text"
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
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 80,
    paddingBottom: SPACING.xl + 8,
    paddingHorizontal: SPACING.xl,
    borderBottomLeftRadius: RADII.xl,
    borderBottomRightRadius: RADII.xl,
  },
  appName: {
    ...TYPOGRAPHY.headline,
    color: COLORS.onPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  tagline: {
    ...TYPOGRAPHY.body,
    color: COLORS.onPrimary,
    opacity: 0.9,
    marginTop: SPACING.xs,
  },
  form: {
    padding: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  title: {
    ...TYPOGRAPHY.headline,
    color: COLORS.onSurface,
    marginBottom: SPACING.xl,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.statusCritical,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  submit: {
    marginTop: SPACING.sm,
  },
});
