import { useCallback, useEffect, useState } from 'react';
import type { AssetCategory } from '@/lib/api';
import { assetCategoryApi } from '@/lib/api';

export function useAssetCategories() {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await assetCategoryApi.getAll();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch asset categories'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories,
  };
}
