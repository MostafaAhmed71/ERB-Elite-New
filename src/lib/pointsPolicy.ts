import { supabase } from './supabase';

export type PointsPolicy = {
  behavior_weekly_cap: number;
  activity_per_term_max: number;
};

const DEFAULT_POLICY: PointsPolicy = {
  behavior_weekly_cap: 50,
  activity_per_term_max: 2,
};

export async function fetchPointsPolicy(): Promise<PointsPolicy> {
  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', 'points_policy')
    .maybeSingle();

  if (error || !data?.value) return DEFAULT_POLICY;

  const v = data.value as Record<string, unknown>;
  return {
    behavior_weekly_cap: Number(v.behavior_weekly_cap ?? DEFAULT_POLICY.behavior_weekly_cap),
    activity_per_term_max: Number(v.activity_per_term_max ?? DEFAULT_POLICY.activity_per_term_max),
  };
}
