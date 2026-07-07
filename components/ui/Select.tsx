import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  value?: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export default function Select({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Pilih',
  error,
}: SelectProps) {
  const [visible, setVisible] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.trigger, error && styles.triggerError]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.onSurfaceVariant} />
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Pilih'}</Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={COLORS.onSurface} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === value && styles.optionSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: RADII.sm,
    padding: SPACING.md + 2,
    minHeight: 48,
  },
  triggerError: {
    borderColor: COLORS.statusCritical,
  },
  triggerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
  },
  placeholder: {
    color: COLORS.outline,
  },
  error: {
    ...TYPOGRAPHY.label,
    color: COLORS.statusCritical,
    marginTop: SPACING.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    maxHeight: '60%',
    paddingBottom: SPACING.xxl + 8,
  },
  closeButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outline,
  },
  modalTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.onSurface,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainer,
  },
  optionSelected: {
    backgroundColor: COLORS.primaryContainer + '30',
  },
  optionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
