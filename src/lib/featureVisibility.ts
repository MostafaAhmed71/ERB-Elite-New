import { saveSchoolSetting } from './schoolConfig';
import { supabase } from './supabase';
import type { UserRole } from '../types';
import type { NavItem } from '../types';
import {
  getNavFeatureId,
  getFeaturesForRole,
  resolveNavFeatureId,
  type FeatureDefinition,
} from './featureCatalog';
import { getNavForRole } from './nav';

export type FeatureVisibilityConfig = {
  hidden: Record<string, boolean>;
};

export const DEFAULT_FEATURE_VISIBILITY: FeatureVisibilityConfig = {
  hidden: {},
};

export async function fetchFeatureVisibility(): Promise<FeatureVisibilityConfig> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_feature_visibility');
  if (!rpcError && rpcData != null) {
    const v = rpcData as Partial<FeatureVisibilityConfig>;
    return { hidden: { ...DEFAULT_FEATURE_VISIBILITY.hidden, ...v?.hidden } };
  }

  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', 'feature_visibility')
    .maybeSingle();
  if (error) throw error;
  const v = data?.value as Partial<FeatureVisibilityConfig> | null;
  return { hidden: { ...DEFAULT_FEATURE_VISIBILITY.hidden, ...v?.hidden } };
}

export async function saveFeatureVisibility(config: FeatureVisibilityConfig): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (uid) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', uid)
      .maybeSingle();
    if (profile?.role === 'platform_developer') {
      const { error } = await supabase.rpc('dev_upsert_feature_flags', { p_value: config });
      if (error) throw error;
      return;
    }
  }
  await saveSchoolSetting('feature_visibility', config);
}

export function isFeatureVisible(
  featureId: string,
  config: FeatureVisibilityConfig,
  feature?: FeatureDefinition,
): boolean {
  if (feature?.locked) return true;
  if (config.hidden[featureId]) return false;
  // توافق مع مفاتيح قديمة لرائد النشاط (nav:activity_leader: → nav:admin:)
  if (featureId.startsWith('nav:admin:')) {
    const legacy = featureId.replace('nav:admin:', 'nav:activity_leader:');
    if (config.hidden[legacy]) return false;
  }
  return true;
}

export function filterNavItems(
  role: UserRole | null,
  config: FeatureVisibilityConfig,
  items?: NavItem[],
): NavItem[] {
  if (!role) return [];
  const nav = items ?? getNavForRole(role);
  const catalog = getFeaturesForRole(role);

  return nav.filter((item) => {
    const id = getNavFeatureId(role, item.path);
    const def = catalog.find((f) => f.id === id);
    return isFeatureVisible(id, config, def);
  });
}

export function isPathVisibleForRole(
  role: UserRole | null,
  pathname: string,
  config: FeatureVisibilityConfig,
): boolean {
  if (!role) return true;
  const featureId = resolveNavFeatureId(role, pathname);
  if (!featureId) return true;
  const def = getFeaturesForRole(role).find((f) => f.id === featureId);
  return isFeatureVisible(featureId, config, def);
}

export function setFeatureHidden(
  config: FeatureVisibilityConfig,
  featureId: string,
  hidden: boolean,
): FeatureVisibilityConfig {
  const next = { ...config.hidden };
  if (hidden) next[featureId] = true;
  else delete next[featureId];
  return { hidden: next };
}

export function resetRoleVisibility(
  config: FeatureVisibilityConfig,
  role: UserRole,
): FeatureVisibilityConfig {
  const ids = getFeaturesForRole(role).map((f) => f.id);
  const next = { ...config.hidden };
  for (const id of ids) delete next[id];
  return { hidden: next };
}

export function showAllForRole(
  config: FeatureVisibilityConfig,
  role: UserRole,
): FeatureVisibilityConfig {
  return resetRoleVisibility(config, role);
}

export function hideAllForRole(
  config: FeatureVisibilityConfig,
  role: UserRole,
): FeatureVisibilityConfig {
  let next = { ...config.hidden };
  for (const f of getFeaturesForRole(role)) {
    if (f.locked) continue;
    next[f.id] = true;
  }
  return { hidden: next };
}
