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

const registerSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
  fullName: z.string().min(1, 'Nama lengkap harus diisi'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', fullName: '' },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setError(null);
    const result = await signUp(data.email, data.password, data.fullName);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.replace('/login');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <View style={styles.brand}>
              <View
                style={styles.logo}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <View style={styles.orbit}>
                  <View style={styles.orbitCore} />
                </View>
              </View>
              <Text style={styles.title}>Daftar</Text>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Nama lengkap"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Nama lengkap"
                  error={errors.fullName?.message}
                />
              )}
            />

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
              title="Daftar"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              style={styles.submit}
            />

            <Button
              title="Masuk"
              onPress={() => router.replace('/login')}
              variant="secondary"
              style={styles.loginButton}
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
    gap: SPACING.sm,
  },
  brand: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 19,
    backgroundColor: COLORS.onSurface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.onSurface,
    shadowOpacity: 0.13,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  orbit: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 4,
    borderColor: COLORS.primary,
    borderTopColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  title: {
    ...TYPOGRAPHY.headline,
    color: COLORS.onSurface,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.statusCritical,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  submit: {
    marginTop: SPACING.sm,
    borderRadius: RADII.full,
    minHeight: 58,
  },
  loginButton: {
    borderRadius: RADII.full,
    minHeight: 58,
    backgroundColor: COLORS.surface,
  },
});
