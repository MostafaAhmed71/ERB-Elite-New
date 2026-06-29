import { supabase } from './supabase';
import { saveSchoolSetting } from './schoolConfig';

export type ActivityWeekSchedule = {
  id: string;
  label: string;
  multiplier: number;
  starts_at: string;
  ends_at: string;
};

export type ActivityWeekConfig = {
  active: boolean;
  multiplier: number;
  label: string;
  starts_at: string | null;
  ends_at: string | null;
  scheduled: ActivityWeekSchedule[];
};

const DEFAULT: ActivityWeekConfig = {
  active: false,
  multiplier: 2,
  label: 'أسبوع النشاط',
  starts_at: null,
  ends_at: null,
  scheduled: [],
};

function parseConfig(v: Record<string, unknown>): ActivityWeekConfig {
  const scheduled = Array.isArray(v.scheduled)
    ? (v.scheduled as ActivityWeekSchedule[]).filter(
        (s) => s.starts_at && s.ends_at && s.label,
      )
    : [];

  return {
    active: Boolean(v.active),
    multiplier: Number(v.multiplier ?? 2),
    label: String(v.label ?? DEFAULT.label),
    starts_at: (v.starts_at as string) ?? null,
    ends_at: (v.ends_at as string) ?? null,
    scheduled,
  };
}

export async function fetchActivityWeek(): Promise<ActivityWeekConfig> {
  return syncScheduledActivityWeek();
}

/** يفعّل أسبوعاً مجدولاً إذا حان موعده */
export function resolveActivityWeekFromConfig(
  config: ActivityWeekConfig,
  now = new Date(),
): ActivityWeekConfig {
  if (isActivityWeekActive(config, now)) return config;

  const due = config.scheduled.find((slot) => {
    const start = new Date(slot.starts_at);
    const end = new Date(slot.ends_at);
    return start <= now && end >= now;
  });

  if (!due) return config;

  return {
    ...config,
    active: true,
    label: due.label,
    multiplier: due.multiplier,
    starts_at: due.starts_at,
    ends_at: due.ends_at,
  };
}

export async function syncScheduledActivityWeek(now = new Date()): Promise<ActivityWeekConfig> {
  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', 'activity_week')
    .maybeSingle();

  const raw = error || !data?.value ? DEFAULT : parseConfig(data.value as Record<string, unknown>);
  const resolved = resolveActivityWeekFromConfig(raw, now);

  const shouldPersist =
    resolved.active &&
    (!raw.active ||
      raw.starts_at !== resolved.starts_at ||
      raw.ends_at !== resolved.ends_at ||
      raw.label !== resolved.label);

  if (shouldPersist) {
    await saveActivityWeek(resolved);
  }

  return resolved;
}

export function isActivityWeekActive(config: ActivityWeekConfig, now = new Date()): boolean {
  if (!config.active) return false;
  if (config.starts_at && new Date(config.starts_at) > now) return false;
  if (config.ends_at && new Date(config.ends_at) < now) return false;
  return true;
}

export function applyActivityWeekMultiplier(points: number, config: ActivityWeekConfig): number {
  if (!isActivityWeekActive(config)) return points;
  return Math.round(points * config.multiplier);
}

export async function saveActivityWeek(config: ActivityWeekConfig): Promise<void> {
  await saveSchoolSetting('activity_week', config);
}

export function newScheduleSlot(): ActivityWeekSchedule {
  const start = new Date();
  start.setDate(start.getDate() + 7);
  start.setHours(7, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  end.setHours(23, 59, 0, 0);

  return {
    id: crypto.randomUUID(),
    label: 'أسبوع النشاط',
    multiplier: 2,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
  };
}
