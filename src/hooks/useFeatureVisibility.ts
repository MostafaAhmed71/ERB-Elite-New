import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import {
  fetchFeatureVisibility,
  isFeatureVisible,
  type FeatureVisibilityConfig,
  DEFAULT_FEATURE_VISIBILITY,
} from '../lib/featureVisibility';
import { FEATURE_CATALOG } from '../lib/featureCatalog';

export function useFeatureVisibilityConfig() {
  return useQuery({
    queryKey: ['feature-visibility'],
    queryFn: fetchFeatureVisibility,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useIsFeatureVisible(featureId: string): boolean {
  const { data: config = DEFAULT_FEATURE_VISIBILITY } = useFeatureVisibilityConfig();
  const def = FEATURE_CATALOG.find((f) => f.id === featureId);
  return isFeatureVisible(featureId, config, def);
}

export function useFeatureVisibilityHelpers() {
  const { data: config = DEFAULT_FEATURE_VISIBILITY } = useFeatureVisibilityConfig();

  return {
    config,
    isVisible: (featureId: string) => {
      const def = FEATURE_CATALOG.find((f) => f.id === featureId);
      return isFeatureVisible(featureId, config, def);
    },
  };
}

export type { FeatureVisibilityConfig };
