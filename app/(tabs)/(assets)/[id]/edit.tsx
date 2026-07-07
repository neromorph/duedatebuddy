import React, { useEffect, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';
import { Asset } from '@/types';
import AssetForm from '@/features/assets/AssetForm';
import LoadingState from '@/components/ui/LoadingState';

export default function EditAsetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single()
      .then(({ data }) => {
        setAsset(data);
        setLoading(false);
      });
  }, [id, user]);

  const handleSubmit = async (formData: { name: string; description?: string; custom_fields: Record<string, unknown> }) => {
    if (!id) return;

    await supabase
      .from('assets')
      .update({
        name: formData.name,
        description: formData.description,
        custom_fields: formData.custom_fields,
      })
      .eq('id', id)
      .eq('user_id', user!.id);

    router.back();
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><LoadingState /></SafeAreaView>;
  }

  if (!asset) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <AssetForm
          onSubmit={handleSubmit}
          defaultValues={{
            name: asset.name,
            description: asset.description || '',
            custom_fields: asset.custom_fields,
          }}
          submitLabel="Simpan Perubahan"
        />
        </View>
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
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
});
