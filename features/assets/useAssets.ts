import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { safeQuery, safeQuerySingle } from '@/lib/supabase-safe';
import { useAuth } from '@/features/auth/useAuth';
import { Asset } from '@/types';

export function useAssets() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!user) return;
    setError(null);
    setLoading(true);
    const { data, error: err } = await safeQuery<Asset>(
      () => supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('name', { ascending: true }),
      'fetchAssets',
    );
    if (err) {
      setError('Gagal memuat aset');
    } else {
      setAssets(data || []);
    }
    setLoading(false);
  }, [user]);

  const fetchTemplates = async () => {
    const { data } = await safeQuery(
      () => supabase.from('asset_templates').select('*').order('name', { ascending: true }),
      'fetchTemplates',
    );
    return data || [];
  };

  const createAsset = async (asset: {
    name: string;
    category: string;
    icon_name: string;
    template_id?: string;
    description?: string;
    custom_fields?: Record<string, unknown>;
  }) => {
    if (!user) return { error: 'Not authenticated' };

    const { data, error: err } = await safeQuerySingle<Asset>(
      () => supabase
        .from('assets')
        .insert({
          user_id: user.id,
          name: asset.name,
          category: asset.category,
          icon_name: asset.icon_name,
          template_id: asset.template_id || null,
          description: asset.description || null,
          custom_fields: asset.custom_fields || {},
        })
        .select()
        .single(),
      'createAsset',
    );

    if (err) return { error: 'Gagal menyimpan aset' };
    return { data };
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    const { error: err } = await safeQuerySingle(
      () => supabase
        .from('assets')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
        .single(),
      'updateAsset',
    );

    if (err) return { error: 'Gagal memperbarui aset' };
    return {};
  };

  const archiveAsset = async (id: string) => {
    const { error: err } = await safeQuerySingle(
      () => supabase
        .from('assets')
        .update({ is_archived: true })
        .eq('id', id)
        .eq('user_id', user?.id)
        .single(),
      'archiveAsset',
    );

    if (err) return { error: 'Gagal mengarsipkan aset' };
    return {};
  };

  return {
    assets,
    loading,
    error,
    fetchAssets,
    fetchTemplates,
    createAsset,
    updateAsset,
    archiveAsset,
  };
}
