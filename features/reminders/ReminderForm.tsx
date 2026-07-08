import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/lib/theme';
import { Reminder } from '@/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import AmountInput from '@/components/ui/AmountInput';
import Button from '@/components/ui/Button';
import { Asset } from '@/types';
import { formatDate } from '@/lib/date';

const reminderSchema = z.object({
  title: z.string().min(1, 'Judul harus diisi'),
  category: z.string().min(1, 'Kategori harus dipilih'),
  due_date: z.date({ required_error: 'Tanggal harus diisi' }),
  recurrence: z.string(),
  amount: z.string().optional(),
  notes: z.string().optional(),
  remind_before_days: z.array(z.number()),
  asset_id: z.string().optional(),
  priority: z.string(),
});

type ReminderFormData = z.infer<typeof reminderSchema>;

interface ReminderFormProps {
  onSubmit: (data: any) => Promise<void>;
  defaultValues?: Partial<Reminder>;
  assets?: Asset[];
  submitLabel?: string;
  loading?: boolean;
}

const CATEGORY_OPTIONS = [
  { label: 'Tagihan', value: 'tagihan' },
  { label: 'Pajak', value: 'pajak' },
  { label: 'Asuransi', value: 'asuransi' },
  { label: 'Cicilan', value: 'cicilan' },
  { label: 'Langganan', value: 'langganan' },
  { label: 'Lainnya', value: 'lainnya' },
];

const RECURRENCE_OPTIONS = [
  { label: 'Tidak Berulang', value: 'none' },
  { label: 'Bulanan', value: 'monthly' },
  { label: 'Tahunan', value: 'yearly' },
];

const PRIORITY_OPTIONS = [
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Normal', value: 'normal' },
  { label: 'Low', value: 'low' },
];

const REMIND_CHIPS = [7, 3, 1, 0];

export default function ReminderForm({
  onSubmit,
  defaultValues,
  assets = [],
  submitLabel = 'Simpan',
  loading = false,
}: ReminderFormProps) {
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: defaultValues?.title || '',
      category: defaultValues?.category || '',
      due_date: defaultValues?.due_date ? new Date(defaultValues.due_date) : new Date(),
      recurrence: defaultValues?.recurrence || 'none',
      amount: defaultValues?.amount ? defaultValues.amount.toString() : '',
      notes: defaultValues?.notes || '',
      remind_before_days: defaultValues?.remind_before_days || [7, 3, 1, 0],
      asset_id: defaultValues?.asset_id || '',
      priority: defaultValues?.priority || 'normal',
    },
  });

  const selectedDays = watch('remind_before_days');
  const [showCalendar, setShowCalendar] = useState(false);

  const handleDateChange = (
    onChange: (date: Date) => void,
    _: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowCalendar(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const toggleRemindDay = (day: number) => {
    const current = selectedDays || [];
    if (current.includes(day)) {
      setValue('remind_before_days', current.filter((d) => d !== day));
    } else {
      setValue('remind_before_days', [...current, day]);
    }
  };

  const handleFormSubmit = (data: ReminderFormData) => {
    onSubmit({
      ...data,
      amount: data.amount ? parseFloat(data.amount) : null,
      due_date: data.due_date.toISOString().split('T')[0],
      asset_id: data.asset_id || null,
    });
  };

  const assetOptions = [
    { label: 'Tidak Ada', value: '' },
    ...assets.map((a) => ({ label: a.name, value: a.id })),
  ];

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Judul"
            value={value}
            onChangeText={onChange}
            placeholder="Misal: Bayar Listrik"
            error={errors.title?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="category"
        render={({ field: { onChange, value } }) => (
          <Select
            label="Kategori"
            value={value}
            options={CATEGORY_OPTIONS}
            onSelect={onChange}
            placeholder="Pilih kategori"
            error={errors.category?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="priority"
        render={({ field: { onChange, value } }) => (
          <Select
            label="Prioritas"
            value={value}
            options={PRIORITY_OPTIONS}
            onSelect={onChange}
          />
        )}
      />

      <Controller
        control={control}
        name="due_date"
        render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Tanggal Jatuh Tempo</Text>
            <TouchableOpacity
              style={[styles.dateTrigger, errors.due_date && styles.dateTriggerError]}
              onPress={() => setShowCalendar(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dateText}>{formatDate(value, 'dd MMMM yyyy')}</Text>
            </TouchableOpacity>
            {errors.due_date?.message && (
              <Text style={styles.error}>{errors.due_date.message}</Text>
            )}

            {showCalendar && (
              <DateTimePicker
                value={value}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => handleDateChange(onChange, event, selectedDate)}
              />
            )}

            {Platform.OS === 'ios' && showCalendar && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowCalendar(false)}
              >
                <Text style={styles.doneText}>Selesai</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="recurrence"
        render={({ field: { onChange, value } }) => (
          <Select
            label="Pengulangan"
            value={value}
            options={RECURRENCE_OPTIONS}
            onSelect={onChange}
          />
        )}
      />

      <Controller
        control={control}
        name="amount"
        render={({ field: { onChange, value } }) => (
          <AmountInput
            label="Jumlah (opsional)"
            value={value || ''}
            onChangeText={onChange}
          />
        )}
      />

      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Catatan (opsional)"
            value={value || ''}
            onChangeText={onChange}
            placeholder="Tambahkan catatan"
            multiline
            numberOfLines={3}
            style={styles.notesInput}
          />
        )}
      />

      <Controller
        control={control}
        name="asset_id"
        render={({ field: { onChange, value } }) => (
          <Select
            label="Aset Terkait (opsional)"
            value={value || ''}
            options={assetOptions}
            onSelect={onChange}
            placeholder="Pilih aset"
          />
        )}
      />

      <View style={styles.chipSection}>
        <Text style={styles.chipLabel}>Ingatkan Sebelum</Text>
        <View style={styles.chipRow}>
          {REMIND_CHIPS.map((day) => (
            <Pressable
              key={day}
              style={[
                styles.chip,
                (selectedDays || []).includes(day) && styles.chipSelected,
              ]}
              onPress={() => toggleRemindDay(day)}
            >
              <Text
                style={[
                  styles.chipText,
                  (selectedDays || []).includes(day) && styles.chipTextSelected,
                ]}
              >
                {day === 0 ? 'H-0' : `H-${day}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

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
  container: {},
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xs,
  },
  dateTrigger: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: RADII.sm,
    padding: SPACING.md + 2,
    minHeight: 48,
    justifyContent: 'center',
  },
  dateTriggerError: {
    borderColor: COLORS.statusCritical,
  },
  dateText: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
  },
  error: {
    ...TYPOGRAPHY.label,
    color: COLORS.statusCritical,
    marginTop: SPACING.xs,
  },
  doneButton: {
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADII.sm,
    marginTop: SPACING.xs,
  },
  doneText: {
    ...TYPOGRAPHY.title,
    color: COLORS.primary,
  },
  chipSection: {
    marginBottom: SPACING.lg,
  },
  chipLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chip: {
    minWidth: 48,
    minHeight: 48,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    ...TYPOGRAPHY.label,
    color: COLORS.onSurfaceVariant,
  },
  chipTextSelected: {
    color: COLORS.onPrimary,
  },
  submit: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
});
