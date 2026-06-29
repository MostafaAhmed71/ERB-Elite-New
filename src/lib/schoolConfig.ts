import { supabase } from './supabase';
import { LEVELS, type LevelInfo, DEFAULT_AXIS_WEIGHTS, type AxisWeights } from './calculations';

export type { AxisWeights };
export { DEFAULT_AXIS_WEIGHTS };

export type ExcellenceLevel = {
  name: string;
  min: number;
};

export type GradeClassCatalog = {
  grades: string[];
  classes: string[];
};

export const DEFAULT_EXCELLENCE_LEVELS: ExcellenceLevel[] = LEVELS.map((l) => ({
  name: l.name,
  min: l.min,
}));

export const DEFAULT_GRADE_CLASS_CATALOG: GradeClassCatalog = {
  grades: ['الأول المتوسط', 'الثاني المتوسط', 'الثالث المتوسط'],
  classes: ['أ', 'ب', 'ج', 'د'],
};

async function fetchSetting<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error || !data?.value) return fallback;
  return data.value as T;
}

export async function fetchAxisWeights(): Promise<AxisWeights> {
  const w = await fetchSetting<Partial<AxisWeights>>('axis_weights', DEFAULT_AXIS_WEIGHTS);
  const full: AxisWeights = {
    activity: w.activity ?? DEFAULT_AXIS_WEIGHTS.activity,
    behavior: w.behavior ?? DEFAULT_AXIS_WEIGHTS.behavior,
    achievement: w.achievement ?? DEFAULT_AXIS_WEIGHTS.achievement,
    initiative: w.initiative ?? DEFAULT_AXIS_WEIGHTS.initiative,
    attendance: w.attendance ?? 0,
  };
  const sum = full.activity + full.behavior + full.achievement + full.initiative + full.attendance;
  if (Math.abs(sum - 1) > 0.02) return DEFAULT_AXIS_WEIGHTS;
  return full;
}

export async function fetchExcellenceLevels(): Promise<ExcellenceLevel[]> {
  const levels = await fetchSetting<ExcellenceLevel[]>('excellence_levels', DEFAULT_EXCELLENCE_LEVELS);
  return levels.length > 0 ? levels.sort((a, b) => a.min - b.min) : DEFAULT_EXCELLENCE_LEVELS;
}

export async function fetchGradeClassCatalog(): Promise<GradeClassCatalog> {
  return fetchSetting('grade_class_catalog', DEFAULT_GRADE_CLASS_CATALOG);
}

export async function saveSchoolSetting(key: string, value: unknown): Promise<void> {
  const payload = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

  const { error: rpcError } = await supabase.rpc('upsert_school_setting', {
    p_key: key,
    p_value: payload,
  });

  if (!rpcError) return;

  const { error } = await supabase
    .from('school_settings')
    .upsert({ key, value: payload, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

export function getLevelInfoFromConfig(score: number, levels: ExcellenceLevel[]): LevelInfo {
  const sorted = [...levels].sort((a, b) => a.min - b.min);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (score >= sorted[i].min) {
      const base = LEVELS.find((l) => l.name === sorted[i].name) ?? LEVELS[0];
      const nextMin = i < sorted.length - 1 ? sorted[i + 1].min : null;
      return { ...base, min: sorted[i].min, nextMin };
    }
  }
  return LEVELS[0];
}

export function computeWeightedFromBreakdown(
  breakdown: {
    activity: number;
    behavior: number;
    achievement: number;
    initiative: number;
    attendance: number;
  },
  weights: AxisWeights = DEFAULT_AXIS_WEIGHTS
): number {
  return Math.round(
    breakdown.activity * weights.activity +
    breakdown.behavior * weights.behavior +
    breakdown.achievement * weights.achievement +
    breakdown.initiative * weights.initiative +
    breakdown.attendance * weights.attendance
  );
}

export function normalizeWeights(weights: AxisWeights): AxisWeights {
  const sum =
    weights.activity + weights.behavior + weights.achievement + weights.initiative + weights.attendance;
  if (sum <= 0) return DEFAULT_AXIS_WEIGHTS;
  return {
    activity: weights.activity / sum,
    behavior: weights.behavior / sum,
    achievement: weights.achievement / sum,
    initiative: weights.initiative / sum,
    attendance: weights.attendance / sum,
  };
}
