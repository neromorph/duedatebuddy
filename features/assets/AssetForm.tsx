import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { COLORS, SPACING, TYPOGRAPHY } from '@/lib/theme';
import { AssetTemplate } from '@/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const assetSchema = z.object({
  name: z.string().min(1, 'Nama aset harus diisi'),
  description: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

interface AssetFormProps {
  onSubmit: (data: { name: string; description?: string; custom_fields: Record<string, unknown> }) => Promise<void>;
  defaultValues?: { name?: string; description?: string; custom_fields?: Record<string, unknown> };
  template?: AssetTemplate;
  submitLabel?: string;
  loading?: boolean;
}

export default function AssetForm({
  onSubmit,
  defaultValues,
  template,
  submitLabel = 'Simpan',
  loading = false,
}: AssetFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
    },
  });

  const handleFormSubmit = (data: AssetFormData) => {
    onSubmit({
      name: data.name,
      description: data.description,
      custom_fields: defaultValues?.custom_fields || {},
    });
  };

  return (
    <View style={styles.container}>
      {template && (
        <View style={styles.templateInfo}>
          <Text style={styles.templateLabel}>Templat: {template.name}</Text>
        </View>
      )}

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Nama Aset"
            value={value}
            onChangeText={onChange}
            placeholder="Masukkan nama aset"
            error={errors.name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Deskripsi (opsional)"
            value={value || ''}
            onChangeText={onChange}
            placeholder="Tambahkan deskripsi"
            multiline
            numberOfLines={3}
            style={styles.notesInput}
          />
        )}
      />

      <Button
        title={submitLabel}
        onPress={handleSubmit(handleFormSubmit)}
        loading={loading}
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  templateInfo: {
    backgroundColor: COLORS.primaryContainer + '30',
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.lg,
  },
  templateLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submit: {
    marginTop: SPACING.sm,
  },
});
