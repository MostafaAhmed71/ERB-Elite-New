import { supabase } from './supabase';
import { saveSchoolSetting } from './schoolConfig';

export type AchievementThresholds = {
  first_points: number;
  bronze: number;
  silver: number;
  gold: number;
  activity: number;
  total: number;
  class_top: number;
  streak_short: number;
  streak_long: number;
};

export const DEFAULT_ACHIEVEMENT_THRESHOLDS: AchievementThresholds = {
  first_points: 1,
  bronze: 200,
  silver: 400,
  gold: 600,
  activity: 100,
  total: 100,
  class_top: 3,
  streak_short: 3,
  streak_long: 7,
};

const SETTING_KEY = 'achievement_thresholds';

export function normalizeAchievementThresholds(
  raw: Partial<AchievementThresholds> | null | undefined,
): AchievementThresholds {
  const n = (value: unknown, fallback: number) => {
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? Math.floor(num) : fallback;
  };
  return {
    first_points: n(raw?.first_points, DEFAULT_ACHIEVEMENT_THRESHOLDS.first_points),
    bronze: n(raw?.bronze, DEFAULT_ACHIEVEMENT_THRESHOLDS.bronze),
    silver: n(raw?.silver, DEFAULT_ACHIEVEMENT_THRESHOLDS.silver),
    gold: n(raw?.gold, DEFAULT_ACHIEVEMENT_THRESHOLDS.gold),
    activity: n(raw?.activity, DEFAULT_ACHIEVEMENT_THRESHOLDS.activity),
    total: n(raw?.total, DEFAULT_ACHIEVEMENT_THRESHOLDS.total),
    class_top: Math.max(1, n(raw?.class_top, DEFAULT_ACHIEVEMENT_THRESHOLDS.class_top)),
    streak_short: Math.max(1, n(raw?.streak_short, DEFAULT_ACHIEVEMENT_THRESHOLDS.streak_short)),
    streak_long: Math.max(1, n(raw?.streak_long, DEFAULT_ACHIEVEMENT_THRESHOLDS.streak_long)),
  };
}

function parseThresholds(raw: unknown): AchievementThresholds | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return normalizeAchievementThresholds(JSON.parse(raw) as Partial<AchievementThresholds>);
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') {
    return normalizeAchievementThresholds(raw as Partial<AchievementThresholds>);
  }
  return null;
}

export async function fetchAchievementThresholds(): Promise<AchievementThresholds> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_achievement_thresholds');
  if (!rpcError && rpcData) {
    return parseThresholds(rpcData) ?? DEFAULT_ACHIEVEMENT_THRESHOLDS;
  }

  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', SETTING_KEY)
    .maybeSingle();
  if (error || !data?.value) return DEFAULT_ACHIEVEMENT_THRESHOLDS;
  return parseThresholds(data.value) ?? DEFAULT_ACHIEVEMENT_THRESHOLDS;
}

export async function saveAchievementThresholds(thresholds: AchievementThresholds): Promise<AchievementThresholds> {
  const value = normalizeAchievementThresholds(thresholds);
  await saveSchoolSetting(SETTING_KEY, value);

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_achievement_thresholds');
  const fromRpc = !rpcError ? parseThresholds(rpcData) : null;
  if (fromRpc && fromRpc.bronze === value.bronze && fromRpc.total === value.total) {
    return fromRpc;
  }

  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', SETTING_KEY)
    .maybeSingle();
  const saved = parseThresholds(data?.value);
  if (!error && saved && saved.bronze === value.bronze && saved.total === value.total) {
    return saved;
  }

  throw new Error(
    'العناصر لم تُحفظ في قاعدة البيانات. شغّل ملف supabase/fix-achievement-thresholds.sql في Supabase ثم أعد الحفظ.',
  );
}

export const ACHIEVEMENT_THRESHOLD_FIELDS: Array<{
  key: keyof AchievementThresholds;
  label: string;
  hint: string;
}> = [
  { key: 'first_points', label: 'أول نقطة', hint: 'أقل نقاط معتمدة لفتح الشارة' },
  { key: 'total', label: 'جامع النقاط', hint: 'إجمالي النقاط المعتمدة' },
  { key: 'activity', label: 'نشيط', hint: 'نقاط محور النشاط' },
  { key: 'bronze', label: 'مستوى برونزي', hint: 'إجمالي النقاط المعتمدة' },
  { key: 'silver', label: 'مستوى فضي', hint: 'إجمالي النقاط المعتمدة' },
  { key: 'gold', label: 'مستوى ذهبي', hint: 'إجمالي النقاط المعتمدة' },
  { key: 'class_top', label: 'نجم الفصل', hint: 'المركز الأقصى (مثلاً 3 = أول ثلاثة)' },
  { key: 'streak_short', label: 'سلسلة قصيرة', hint: 'عدد الأيام المتتالية' },
  { key: 'streak_long', label: 'سلسلة طويلة', hint: 'عدد الأيام المتتالية' },
];
