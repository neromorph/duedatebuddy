import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, RADII } from '@/lib/theme';
import { AssetTemplate } from '@/types';

interface TemplatePickerProps {
  templates: AssetTemplate[];
  onSelect: (template: AssetTemplate) => void;
}

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  car: 'car',
  motorcycle: 'bicycle',
  wifi: 'wifi',
  flash: 'flash',
  shield: 'shield-checkmark',
  'credit-card': 'card',
  'file-text': 'document-text',
};

export default function TemplatePicker({ templates, onSelect }: TemplatePickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pilih Templat Aset</Text>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => onSelect(item)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={iconMap[item.icon_name] || 'folder-outline'}
                size={32}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.category}>{item.category}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.headline,
    color: COLORS.onSurface,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  grid: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADII.md,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primaryContainer + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...TYPOGRAPHY.title,
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  category: {
    ...TYPOGRAPHY.label,
    color: COLORS.onSurfaceVariant,
    textTransform: 'capitalize',
  },
});
