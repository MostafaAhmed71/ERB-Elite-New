import { supabase } from './supabase';

export type PlatformSchedule = {
  id: string;
  slug: string;
  label: string;
  job_type: string;
  payload: Record<string, unknown>;
  interval_minutes: number;
  enabled: boolean;
  last_enqueued_at: string | null;
  next_run_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function listPlatformSchedules(): Promise<PlatformSchedule[]> {
  const { data, error } = await supabase
    .from('platform_schedules')
    .select('*')
    .order('next_run_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlatformSchedule[];
}

export async function tickPlatformSchedules(limit = 20): Promise<{
  enqueued: number;
  job_ids: string[];
  at?: string;
}> {
  const { data, error } = await supabase.rpc('tick_platform_schedules', { p_limit: limit });
  if (error) throw error;
  const raw = (data ?? {}) as { enqueued?: number; job_ids?: string[]; at?: string };
  return {
    enqueued: raw.enqueued ?? 0,
    job_ids: Array.isArray(raw.job_ids) ? raw.job_ids : [],
    at: raw.at,
  };
}

export async function upsertPlatformSchedule(input: {
  slug: string;
  label: string;
  job_type: string;
  payload?: Record<string, unknown>;
  interval_minutes?: number;
  enabled?: boolean;
  notes?: string | null;
  reset_next?: boolean;
}): Promise<string> {
  const { data, error } = await supabase.rpc('upsert_platform_schedule', {
    p_slug: input.slug,
    p_label: input.label,
    p_job_type: input.job_type,
    p_payload: input.payload ?? {},
    p_interval_minutes: input.interval_minutes ?? 1440,
    p_enabled: input.enabled ?? true,
    p_notes: input.notes ?? null,
    p_reset_next: input.reset_next ?? false,
  });
  if (error) throw error;
  return data as string;
}

export async function setPlatformScheduleEnabled(id: string, enabled: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_platform_schedule_enabled', {
    p_id: id,
    p_enabled: enabled,
  });
  if (error) throw error;
  return !!data;
}

export async function deletePlatformSchedule(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_platform_schedule', { p_id: id });
  if (error) throw error;
  return !!data;
}

export function formatIntervalMinutes(mins: number): string {
  if (mins < 60) return `كل ${mins} دقيقة`;
  if (mins < 1440) {
    const h = Math.round(mins / 60);
    return `كل ${h} ساعة`;
  }
  if (mins % 1440 === 0) {
    const d = mins / 1440;
    return d === 1 ? 'يومياً' : `كل ${d} أيام`;
  }
  if (mins % 10080 === 0) {
    const w = mins / 10080;
    return w === 1 ? 'أسبوعياً' : `كل ${w} أسابيع`;
  }
  return `كل ${mins} دقيقة`;
}
