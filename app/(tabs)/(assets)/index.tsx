import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY } from '@/lib/theme';
import { useAssets } from '@/features/assets/useAssets';
import AssetCard from '@/features/assets/AssetCard';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import FAB from '@/components/ui/FAB';

export default function AssetsListScreen() {
  const router = useRouter();
  const { assets, loading, error, fetchAssets } = useAssets();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchAssets();
    }, [fetchAssets])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAssets();
    setRefreshing(false);
  };

  const groupedAssets = assets.reduce(
    (acc, asset) => {
      const category = asset.category;
      const existing = acc.find((g) => g.title === category);
      if (existing) {
        existing.data.push(asset);
      } else {
        acc.push({ title: category, data: [asset] });
      }
      return acc;
    },
    [] as { title: string; data: typeof assets }[]
  );

  const CATEGORY_LABELS: Record<string, string> = {
    property: 'Properti',
    vehicle: 'Kendaraan',
    subscription: 'Langganan',
    utility: 'Utilitas',
    insurance: 'Asuransi',
    loan: 'Pinjaman',
    custom: 'Kustom',
  };

  if (loading && assets.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error && assets.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ErrorState message={error} onRetry={fetchAssets} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SectionList
        contentContainerStyle={styles.listContent}
        sections={groupedAssets}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        renderItem={({ item }) => (
          <AssetCard
            asset={item}
            onPress={() => router.push(`/(tabs)/(assets)/${item.id}`)}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>
            {CATEGORY_LABELS[title] || title}
          </Text>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="folder-open-outline"
            title="Belum ada aset"
            subtitle="Tambah aset pertamamu untuk memulai"
            ctaLabel="Tambah Aset"
            onCtaPress={() => router.push('/(tabs)/(assets)/tambah')}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <FAB onPress={() => router.push('/(tabs)/(assets)/tambah')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  sectionHeader: {
    ...TYPOGRAPHY.title,
    color: COLORS.onSurfaceVariant,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    textTransform: 'capitalize',
  },
});
