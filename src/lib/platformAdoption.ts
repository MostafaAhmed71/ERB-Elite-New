import { supabase } from './supabase';

export type AdoptionRoleStat = {
  role: string;
  total: number;
  active_week: number;
  active_month: number;
  week_pct: number;
};

export const ADOPTION_ROLE_LABELS: Record<string, string> = {
  teacher: 'المعلمون',
  student: 'الطلاب',
  parent: 'أولياء الأمور',
  activity_leader: 'رائد النشاط',
  supervisor: 'المشرف التربوي',
};

export async function touchUserLastSeen(): Promise<void> {
  const { error } = await supabase.rpc('touch_user_last_seen');
  if (error) console.warn('touch_user_last_seen:', error.message);
}

export async function fetchPlatformAdoptionStats(): Promise<AdoptionRoleStat[]> {
  const { data, error } = await supabase.rpc('get_platform_adoption_stats');
  if (error) throw error;
  return (data ?? []) as AdoptionRoleStat[];
}
