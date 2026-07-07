import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '@/lib/theme';
import { Asset } from '@/types';
import Card from '@/components/ui/Card';

interface AssetCardProps {
  asset: Asset;
  onPress: () => void;
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

export default function AssetCard({ asset, onPress }: AssetCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={iconMap[asset.icon_name] || 'folder-outline'}
              size={24}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.content}>
            <Text style={styles.name}>{asset.name}</Text>
            <Text style={styles.category}>{asset.category}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.outline} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primaryContainer + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  name: {
    ...TYPOGRAPHY.title,
    color: COLORS.onSurface,
  },
  category: {
    ...TYPOGRAPHY.label,
    color: COLORS.onSurfaceVariant,
    textTransform: 'capitalize',
    marginTop: 2,
  },
});
