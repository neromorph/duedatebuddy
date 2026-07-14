import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { COLORS, SPACING, TYPOGRAPHY, RADII } from '@/lib/theme';
import { useAuth } from '@/features/auth/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const resetSchema = z.object({
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
});

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const recoveryUrl = Linking.useURL();
  const { startPasswordRecovery, updatePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '' },
  });

  useEffect(() => {
    if (!recoveryUrl) return;
    let cancelled = false;
    startPasswordRecovery(recoveryUrl)
      .then((result) => {
        if (cancelled) return;
        if (result.error) setMessage(result.error);
        setReady(Boolean(result.recovered));
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Tautan reset tidak valid.');
      });
    return () => { cancelled = true; };
  }, [recoveryUrl, startPasswordRecovery]);

  const onSubmit = async (data: ResetForm) => {
    setLoading(true);
    setMessage(null);
    const result = await updatePassword(data.password);
    setLoading(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage('Kata sandi baru tersimpan.');
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.form}>
            <View style={styles.logo}>
              <View style={styles.orbit} />
            </View>
            <Text style={styles.title}>Buat kata sandi baru</Text>
            <Text style={styles.subtitle}>Masukkan kata sandi baru untuk akun DueDateBuddy.</Text>

            {message && <Text style={styles.message}>{message}</Text>}

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Kata sandi baru"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Minimal 6 karakter"
                  secureTextEntry
                  error={errors.password?.message}
                />
              )}
            />

            <Button
              title="Simpan kata sandi"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              disabled={!ready}
              style={styles.submit}
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
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.onSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
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
    fontSize: 32,
    lineHeight: 38,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.md,
  },
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.statusCritical,
    marginBottom: SPACING.sm,
  },
  submit: {
    marginTop: SPACING.sm,
    borderRadius: RADII.full,
    minHeight: 58,
  },
});
