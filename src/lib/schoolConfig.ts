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

export async function fetchGradeClassCatalog(): Promise<GradeClassCatalog> {
  return fetchSetting('grade_class_catalog', DEFAULT_GRADE_CLASS_CATALOG);
}

export async function saveSchoolSetting(key: string, value: unknown): Promise<void> {
  const payload = JSON.parse(JSON.stringify(value)) as Record<string, unknown> | unknown[];

  const { error: rpcError } = await supabase.rpc('upsert_school_setting', {
    p_key: key,
    p_value: payload as Record<string, unknown>,
  });

  if (!rpcError) return;

  const { error } = await supabase
    .from('school_settings')
    .upsert({ key, value: payload, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

function parseExcellenceLevels(raw: unknown): ExcellenceLevel[] {
  const source = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { levels?: unknown }).levels)
      ? (raw as { levels: unknown[] }).levels
      : null;
  if (!source) return [];
  return source
    .map((row) => {
      const item = row as { name?: unknown; min?: unknown };
      const name = String(item?.name ?? '').trim();
      const min = Number(item?.min);
      if (!name || !Number.isFinite(min)) return null;
      return { name, min: Math.floor(min) };
    })
    .filter((row): row is ExcellenceLevel => row != null)
    .sort((a, b) => a.min - b.min);
}

export function normalizeExcellenceLevels(raw: unknown): ExcellenceLevel[] {
  const parsed = parseExcellenceLevels(raw);
  return parsed.length > 0 ? parsed : DEFAULT_EXCELLENCE_LEVELS;
}

export async function fetchExcellenceLevels(): Promise<ExcellenceLevel[]> {
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_excellence_levels');
    if (!rpcError && rpcData != null) {
      const fromRpc = parseExcellenceLevels(rpcData);
      if (fromRpc.length > 0) return fromRpc;
    }

    const levels = await fetchSetting<unknown>('excellence_levels', DEFAULT_EXCELLENCE_LEVELS);
    return normalizeExcellenceLevels(levels);
  } catch {
    return DEFAULT_EXCELLENCE_LEVELS;
  }
}

export async function saveExcellenceLevels(levels: ExcellenceLevel[]): Promise<ExcellenceLevel[]> {
  const value = normalizeExcellenceLevels(levels);
  await saveSchoolSetting('excellence_levels', value);

  const saved = await fetchExcellenceLevels();
  const same =
    saved.length === value.length &&
    saved.every((lvl, i) => lvl.name === value[i].name && lvl.min === value[i].min);
  if (!same) {
    throw new Error(
      'مستويات التميز لم تُحفظ. شغّل ملف supabase/fix-achievement-thresholds.sql في Supabase ثم أعد الحفظ.',
    );
  }
  return saved;
}

export function getLevelInfoFromConfig(score: number, levels: ExcellenceLevel[]): LevelInfo {
  const sorted = normalizeExcellenceLevels(levels);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (score >= sorted[i].min) {
      const byName = LEVELS.find((l) => l.name === sorted[i].name);
      const byIndex = LEVELS[Math.min(i, LEVELS.length - 1)];
      const base = byName ?? byIndex ?? LEVELS[0];
      const nextMin = i < sorted.length - 1 ? sorted[i + 1].min : null;
      return { ...base, name: sorted[i].name, min: sorted[i].min, nextMin };
    }
  }
  const first = sorted[0] ?? DEFAULT_EXCELLENCE_LEVELS[0];
  return {
    ...LEVELS[0],
    name: first.name,
    min: first.min,
    nextMin: sorted[1]?.min ?? null,
  };
}

export function buildLevelLadder(levels: ExcellenceLevel[]): LevelInfo[] {
  const sorted = normalizeExcellenceLevels(levels);
  return sorted.map((lvl, i) => {
    const byName = LEVELS.find((l) => l.name === lvl.name);
    const byIndex = LEVELS[Math.min(i, LEVELS.length - 1)];
    const base = byName ?? byIndex ?? LEVELS[0];
    return {
      ...base,
      name: lvl.name,
      min: lvl.min,
      nextMin: i < sorted.length - 1 ? sorted[i + 1].min : null,
    };
  });
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
