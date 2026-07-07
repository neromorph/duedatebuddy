import React, { useEffect, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '@/lib/theme';
import { useAssets } from '@/features/assets/useAssets';
import { AssetTemplate } from '@/types';
import TemplatePicker from '@/features/assets/TemplatePicker';
import AssetForm from '@/features/assets/AssetForm';
import LoadingState from '@/components/ui/LoadingState';

export default function TambahAsetScreen() {
  const router = useRouter();
  const { fetchTemplates, createAsset } = useAssets();
  const [templates, setTemplates] = useState<AssetTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AssetTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTemplates().then((data) => {
      setTemplates(data);
      setLoading(false);
    });
  }, []);

  const handleTemplateSelect = (template: AssetTemplate) => {
    setSelectedTemplate(template);
  };

  const handleSubmit = async (data: { name: string; description?: string; custom_fields: Record<string, unknown> }) => {
    if (!selectedTemplate) return;
    setSubmitting(true);
    await createAsset({
      name: data.name,
      category: selectedTemplate.category,
      icon_name: selectedTemplate.icon_name,
      template_id: selectedTemplate.id,
      description: data.description,
      custom_fields: data.custom_fields,
    });
    setSubmitting(false);
    router.back();
  };

  if (loading) return <SafeAreaView style={styles.container}><LoadingState /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          {selectedTemplate ? (
            <View style={styles.formContent}>
              <AssetForm
                onSubmit={handleSubmit}
                template={selectedTemplate}
                submitLabel="Tambah Aset"
                loading={submitting}
                title="Tambah Aset"
              />
            </View>
        ) : (
          <TemplatePicker
            templates={templates}
            onSelect={handleTemplateSelect}
          />
          )}
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
    paddingTop: SPACING.lg,
  },
  formContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
});
