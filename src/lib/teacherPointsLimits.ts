import { supabase } from './supabase';
import { saveSchoolSetting } from './schoolConfig';
import { embedOne } from './supabaseEmbeds';

export type TeacherPointsLimits = {
  weekly_limit: number;
  daily_limit: number | null;
};

export type TeacherLimitRow = {
  teacherId: string;
  name: string;
  subject: string | null;
  weekly_limit: number;
  daily_limit: number | null;
};

export const DEFAULT_TEACHER_POINTS_LIMITS: TeacherPointsLimits = {
  weekly_limit: 100,
  daily_limit: null,
};

export async function fetchTeacherPointsLimits(): Promise<TeacherPointsLimits> {
  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', 'teacher_points_limits')
    .maybeSingle();

  if (error || !data?.value) return DEFAULT_TEACHER_POINTS_LIMITS;

  const v = data.value as Record<string, unknown>;
  const daily = v.daily_limit;
  return {
    weekly_limit: Math.max(1, Number(v.weekly_limit ?? DEFAULT_TEACHER_POINTS_LIMITS.weekly_limit)),
    daily_limit:
      daily === null || daily === undefined || daily === ''
        ? null
        : Math.max(1, Number(daily)),
  };
}

export async function fetchTeacherLimitRows(): Promise<TeacherLimitRow[]> {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, subject, weekly_points_limit, daily_points_limit, users(full_name)')
    .order('id');

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const user = embedOne<{ full_name: string }>(row.users);
      if (!user) return null;
      return {
        teacherId: row.id,
        name: user.full_name,
        subject: row.subject,
        weekly_limit: row.weekly_points_limit ?? DEFAULT_TEACHER_POINTS_LIMITS.weekly_limit,
        daily_limit: row.daily_points_limit,
      } satisfies TeacherLimitRow;
    })
    .filter((row): row is TeacherLimitRow => row !== null)
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

/** حفظ الحد الافتراضي للمعلمين الجدد فقط — دون المساس بحدود المعلمين الحاليين */
export async function saveTeacherPointsLimits(limits: TeacherPointsLimits): Promise<void> {
  const normalized: TeacherPointsLimits = {
    weekly_limit: Math.max(1, limits.weekly_limit),
    daily_limit: limits.daily_limit != null ? Math.max(1, limits.daily_limit) : null,
  };

  await saveSchoolSetting('teacher_points_limits', normalized);
}

/** تطبيق الحد الافتراضي على جميع المعلمين الحاليين */
export async function applyDefaultLimitsToAllTeachers(limits: TeacherPointsLimits): Promise<void> {
  const normalized = {
    weekly_limit: Math.max(1, limits.weekly_limit),
    daily_limit: limits.daily_limit != null ? Math.max(1, limits.daily_limit) : null,
  };

  const { error } = await supabase.rpc('apply_teacher_points_limits', {
    p_limits: normalized,
  });
  if (error) throw error;
}

/** حفظ حدود مخصّصة لكل معلم */
export async function saveTeacherLimitRows(rows: TeacherLimitRow[]): Promise<void> {
  if (rows.length === 0) return;

  const payload = rows.map((row) => ({
    teacher_id: row.teacherId,
    weekly_limit: Math.max(1, row.weekly_limit),
    daily_limit: row.daily_limit,
  }));

  const { error } = await supabase.rpc('save_teacher_limits_batch', {
    p_limits: payload,
  });
  if (error) throw error;
}
