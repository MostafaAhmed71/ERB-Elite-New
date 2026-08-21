import { supabase } from './supabase';

export type PlatformJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'retrying';

export type PlatformJob = {
  id: string;
  job_type: string;
  status: PlatformJobStatus;
  priority: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  progress: number;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  created_by: string | null;
  locked_at: string | null;
  locked_by: string | null;
  run_after: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformJobEvent = {
  id: string;
  job_id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export type JobStats = {
  queued: number;
  running: number;
  retrying: number;
  failed: number;
  succeeded: number;
  cancelled: number;
  total: number;
};

const STATUS_LABELS: Record<PlatformJobStatus, string> = {
  queued: 'في الانتظار',
  running: 'قيد التنفيذ',
  succeeded: 'نجحت',
  failed: 'فشلت',
  cancelled: 'ملغاة',
  retrying: 'إعادة محاولة',
};

export function platformJobStatusLabel(status: PlatformJobStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export async function listPlatformJobs(opts?: {
  status?: PlatformJobStatus | 'all';
  jobType?: string;
  limit?: number;
}): Promise<PlatformJob[]> {
  let q = supabase
    .from('platform_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 50);

  if (opts?.status && opts.status !== 'all') {
    q = q.eq('status', opts.status);
  }
  if (opts?.jobType) {
    q = q.eq('job_type', opts.jobType);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PlatformJob[];
}

export async function getPlatformJobStats(): Promise<JobStats> {
  const { data, error } = await supabase.from('platform_jobs').select('status');
  if (error) throw error;
  const stats: JobStats = {
    queued: 0,
    running: 0,
    retrying: 0,
    failed: 0,
    succeeded: 0,
    cancelled: 0,
    total: data?.length ?? 0,
  };
  const statusKeys: Array<keyof Omit<JobStats, 'total'>> = [
    'queued',
    'running',
    'retrying',
    'failed',
    'succeeded',
    'cancelled',
  ];
  for (const row of data ?? []) {
    const s = (row as { status: PlatformJobStatus }).status;
    if ((statusKeys as string[]).includes(s)) {
      stats[s as keyof Omit<JobStats, 'total'>] += 1;
    }
  }
  return stats;
}

export async function listPlatformJobEvents(jobId: string): Promise<PlatformJobEvent[]> {
  const { data, error } = await supabase
    .from('platform_job_events')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as PlatformJobEvent[];
}

export async function enqueuePlatformJob(
  jobType: string,
  payload: Record<string, unknown> = {},
  priority = 100,
): Promise<string> {
  const { data, error } = await supabase.rpc('enqueue_platform_job', {
    p_job_type: jobType,
    p_payload: payload,
    p_priority: priority,
  });
  if (error) throw error;
  return data as string;
}

export async function cancelPlatformJob(jobId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('cancel_platform_job', { p_job_id: jobId });
  if (error) throw error;
  return !!data;
}

export async function retryPlatformJob(jobId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('retry_platform_job', { p_job_id: jobId });
  if (error) throw error;
  return !!data;
}

export async function invokeJobsWorker(limit?: number): Promise<{
  claimed?: number;
  results?: unknown[];
  schedule_tick?: unknown;
}> {
  const { data, error } = await supabase.functions.invoke('jobs-worker', {
    body: { limit: limit ?? 10 },
  });
  if (error) throw error;
  return data as { claimed?: number; results?: unknown[]; schedule_tick?: unknown };
}

/** أنواع مهام أولية للاختبار والتشخيص */
export const KNOWN_JOB_TYPES = [
  { id: 'ping', label: 'Ping (اختبار طابور)', description: 'مهمة تجريبية تُكمَل فوراً عبر العامل' },
  { id: 'health_check', label: 'فحص صحة', description: 'تسجيل لقطة صحة الخدمات في النتيجة' },
  { id: 'whatsapp_reminder', label: 'تذكير واتساب (Job)', description: 'Wave 5 — إرسال حي افتراضي' },
  { id: 'academic_reminder', label: 'تذكير أكاديمي (Job)', description: 'Wave 5 — واجب/خطة عبر واتساب حي' },
  { id: 'parent_digest', label: 'ملخص أولياء (Job)', description: 'Wave 5 — استدعاء weekly-parent-digest حي' },
  { id: 'dev_whatsapp_alert', label: 'تنبيه مطور واتساب', description: 'إرسال خطأ مستخدم لرقم مطور المنصة' },
] as const;
