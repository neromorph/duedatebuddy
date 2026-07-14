import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/lib/theme';
import {
  buildRecurrencePreset,
  parseLocalDate,
  ReminderRecurrence,
  summarizeRecurrence,
} from '@/lib/recurrence';

const UNITS = [
  { label: 'Hari', value: 'day' },
  { label: 'Minggu', value: 'week' },
  { label: 'Bulan', value: 'month' },
  { label: 'Tahun', value: 'year' },
];

const WEEKDAYS = [
  { label: 'Min', value: 0 },
  { label: 'Sen', value: 1 },
  { label: 'Sel', value: 2 },
  { label: 'Rab', value: 3 },
  { label: 'Kam', value: 4 },
  { label: 'Jum', value: 5 },
  { label: 'Sab', value: 6 },
];

const MONTHLY_MODES = [
  { label: 'Tanggal yang sama', value: 'dayOfMonth' },
  { label: 'Hari dalam minggu yang sama', value: 'weekday' },
];

const END_MODES = [
  { label: 'Tidak pernah', value: 'never' },
  { label: 'Pada tanggal', value: 'date' },
  { label: 'Setelah N kali', value: 'count' },
];

type EnabledRule = Extract<ReminderRecurrence, { enabled: true }>;

interface Props {
  visible: boolean;
  dueDate: string;
  value: ReminderRecurrence;
  onClose: () => void;
  onSave: (value: ReminderRecurrence) => void;
}

function ensureEnabled(value: ReminderRecurrence, dueDate: string): EnabledRule {
  if (value.enabled) return value;
  const preset = buildRecurrencePreset('weekly', dueDate);
  return preset as EnabledRule;
}

export default function RecurrenceEditorModal({ visible, dueDate, value, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<EnabledRule>(() => ensureEnabled(value, dueDate));

  useEffect(() => {
    if (visible) {
      setDraft(ensureEnabled(value, dueDate));
    }
  }, [visible, value, dueDate]);

  const dayOfMonth = useMemo(() => parseLocalDate(dueDate).getDate(), [dueDate]);
  const weekdayOfDue = useMemo(() => parseLocalDate(dueDate).getDay(), [dueDate]);

  const update = (patch: Partial<EnabledRule>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const changeUnit = (unit: EnabledRule['unit']) => {
    const next: EnabledRule = { ...draft, unit };
    if (unit === 'week') {
      delete (next as Partial<EnabledRule>).monthlyMode;
      delete (next as Partial<EnabledRule>).dayOfMonth;
      delete (next as Partial<EnabledRule>).weekOfMonth;
      delete (next as Partial<EnabledRule>).weekday;
    } else if (unit === 'month') {
      next.monthlyMode = draft.monthlyMode ?? 'dayOfMonth';
      next.dayOfMonth = draft.dayOfMonth ?? dayOfMonth;
      delete (next as Partial<EnabledRule>).daysOfWeek;
    } else if (unit === 'day') {
      delete (next as Partial<EnabledRule>).daysOfWeek;
      delete (next as Partial<EnabledRule>).monthlyMode;
      delete (next as Partial<EnabledRule>).dayOfMonth;
      delete (next as Partial<EnabledRule>).weekOfMonth;
      delete (next as Partial<EnabledRule>).weekday;
    } else {
      delete (next as Partial<EnabledRule>).daysOfWeek;
      delete (next as Partial<EnabledRule>).monthlyMode;
      delete (next as Partial<EnabledRule>).dayOfMonth;
      delete (next as Partial<EnabledRule>).weekOfMonth;
      delete (next as Partial<EnabledRule>).weekday;
    }
    setDraft(next);
  };

  const toggleWeekday = (weekday: number) => {
    const current = draft.daysOfWeek || [];
    const next = current.includes(weekday)
      ? current.filter((d) => d !== weekday)
      : [...current, weekday].sort((a, b) => a - b);
    update({ daysOfWeek: next.length ? next : undefined });
  };

  const changeMonthlyMode = (mode: 'dayOfMonth' | 'weekday') => {
    if (mode === 'dayOfMonth') {
      update({
        monthlyMode: 'dayOfMonth',
        dayOfMonth: draft.dayOfMonth ?? dayOfMonth,
        weekOfMonth: undefined,
        weekday: undefined,
      });
    } else {
      update({
        monthlyMode: 'weekday',
        dayOfMonth: undefined,
        weekOfMonth: draft.weekOfMonth ?? 1,
        weekday: draft.weekday ?? weekdayOfDue,
      });
    }
  };

  const changeEndMode = (mode: 'never' | 'date' | 'count') => {
    if (mode === 'never') update({ end: { type: 'never' } });
    else if (mode === 'date') update({ end: { type: 'date', until: draft.startDate } });
    else update({ end: { type: 'count', occurrences: 2 } });
  };

  const previewSummary = summarizeRecurrence(draft, dueDate);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Pengulangan Kustom</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.label}>Ulangi setiap</Text>
            <View style={styles.intervalRow}>
              <Pressable
                style={styles.stepperButton}
                onPress={() => update({ interval: Math.max(1, draft.interval - 1) })}
              >
                <Text style={styles.stepperText}>-</Text>
              </Pressable>
              <Text style={styles.intervalValue}>{draft.interval}</Text>
              <Pressable
                style={styles.stepperButton}
                onPress={() => update({ interval: draft.interval + 1 })}
              >
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
            </View>

            <Select
              label="Satuan"
              value={draft.unit}
              options={UNITS}
              onSelect={(unit) => changeUnit(unit as EnabledRule['unit'])}
            />

            {draft.unit === 'week' && (
              <View style={styles.section}>
                <Text style={styles.label}>Hari</Text>
                <Text style={styles.helper}>Jika kosong, memakai hari dari tanggal jatuh tempo.</Text>
                <View style={styles.weekdayRow}>
                  {WEEKDAYS.map((day) => {
                    const selected = (draft.daysOfWeek || []).includes(day.value);
                    return (
                      <Pressable
                        key={day.value}
                        style={[styles.weekdayChip, selected && styles.chipSelected]}
                        onPress={() => toggleWeekday(day.value)}
                      >
                        <Text style={[styles.weekdayText, selected && styles.chipTextSelected]}>
                          {day.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {draft.unit === 'month' && (
              <>
                <Select
                  label="Pengaturan bulanan"
                  value={draft.monthlyMode || 'dayOfMonth'}
                  options={MONTHLY_MODES}
                  onSelect={(value) => changeMonthlyMode(value as 'dayOfMonth' | 'weekday')}
                />
                {draft.monthlyMode === 'dayOfMonth' && (
                  <View style={styles.section}>
                    <Text style={styles.label}>Hari dalam bulan</Text>
                    <View style={styles.stepperRow}>
                      <Pressable
                        style={styles.stepperButton}
                        onPress={() => update({ dayOfMonth: Math.max(1, (draft.dayOfMonth ?? dayOfMonth) - 1) })}
                      >
                        <Text style={styles.stepperText}>-</Text>
                      </Pressable>
                      <Text style={styles.intervalValue}>{draft.dayOfMonth ?? dayOfMonth}</Text>
                      <Pressable
                        style={styles.stepperButton}
                        onPress={() => update({ dayOfMonth: Math.min(31, (draft.dayOfMonth ?? dayOfMonth) + 1) })}
                      >
                        <Text style={styles.stepperText}>+</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.helper}>
                      Jika bulan tidak memiliki tanggal ini, pengingat akan jatuh pada hari terakhir bulan.
                    </Text>
                  </View>
                )}
                {draft.monthlyMode === 'weekday' && (
                  <View style={styles.section}>
                    <Select
                      label="Hari"
                      value={String(draft.weekday ?? weekdayOfDue)}
                      options={WEEKDAYS.map((d) => ({ label: d.label, value: String(d.value) }))}
                      onSelect={(value) => update({ weekday: Number(value) })}
                    />
                    <Select
                      label="Urutan dalam bulan"
                      value={String(draft.weekOfMonth ?? 1)}
                      options={[
                        { label: 'Pertama', value: '1' },
                        { label: 'Kedua', value: '2' },
                        { label: 'Ketiga', value: '3' },
                        { label: 'Keempat', value: '4' },
                        { label: 'Terakhir', value: '-1' },
                      ]}
                      onSelect={(value) =>
                        update({ weekOfMonth: Number(value) as 1 | 2 | 3 | 4 | -1 })
                      }
                    />
                  </View>
                )}
              </>
            )}

            <View style={styles.section}>
              <Select
                label="Berakhir"
                value={draft.end.type}
                options={END_MODES}
                onSelect={(value) => changeEndMode(value as 'never' | 'date' | 'count')}
              />
              {draft.end.type === 'date' && (
                <Text style={styles.helper}>Pengingat berakhir pada: {draft.end.until}</Text>
              )}
              {draft.end.type === 'count' && (
                <View style={styles.stepperRow}>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() =>
                      update({
                        end: {
                          type: 'count',
                          occurrences: Math.max(1, draft.end.type === 'count' ? draft.end.occurrences - 1 : 1),
                        },
                      })
                    }
                  >
                    <Text style={styles.stepperText}>-</Text>
                  </Pressable>
                  <Text style={styles.intervalValue}>
                    {draft.end.type === 'count' ? draft.end.occurrences : 1}
                  </Text>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() =>
                      update({
                        end: {
                          type: 'count',
                          occurrences:
                            draft.end.type === 'count' ? draft.end.occurrences + 1 : 2,
                        },
                      })
                    }
                  >
                    <Text style={styles.stepperText}>+</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.preview}>
              <Text style={styles.label}>Pratinjau</Text>
              <Text style={styles.previewText}>{previewSummary}</Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button title="Simpan" onPress={() => onSave(draft)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outline,
  },
  title: { ...TYPOGRAPHY.title, color: COLORS.onSurface },
  closeButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SPACING.lg },
  label: { ...TYPOGRAPHY.label, color: COLORS.onSurfaceVariant, marginBottom: SPACING.xs },
  helper: { ...TYPOGRAPHY.body, color: COLORS.onSurfaceVariant, marginBottom: SPACING.sm },
  section: { marginBottom: SPACING.lg },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { ...TYPOGRAPHY.title, color: COLORS.onSurface },
  intervalValue: {
    ...TYPOGRAPHY.title,
    color: COLORS.onSurface,
    minWidth: 40,
    textAlign: 'center',
  },
  weekdayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  weekdayChip: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: { ...TYPOGRAPHY.label, color: COLORS.onSurfaceVariant },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTextSelected: { color: COLORS.onPrimary },
  preview: {
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADII.md,
    marginTop: SPACING.md,
  },
  previewText: { ...TYPOGRAPHY.body, color: COLORS.onSurface, fontWeight: '600' },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.outline,
  },
});
