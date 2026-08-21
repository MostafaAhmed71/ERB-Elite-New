import { supabase } from './supabase';
import { exportRowsToCsv } from './exportExcel';

export type PublicTableInfo = {
  table_name: string;
  estimated_rows: number;
};

export type TablePreview = {
  table: string;
  total: number;
  limit: number;
  offset: number;
  rows: Record<string, unknown>[];
};

const SENSITIVE_KEY = /(password|secret|token|api_key|service_role|private_key|hash|salt)/i;

export function maskSensitiveRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = '***';
      continue;
    }
    if (['phone', 'parent_phone', 'mobile', 'whatsapp'].includes(key.toLowerCase()) && typeof value === 'string') {
      out[key] = value.slice(0, 3) + '****';
      continue;
    }
    if (['email', 'parent_email'].includes(key.toLowerCase()) && typeof value === 'string' && value.includes('@')) {
      const [u, d] = value.split('@');
      out[key] = `${u.slice(0, 2)}***@${d}`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

export async function listPublicTables(): Promise<PublicTableInfo[]> {
  const { data, error } = await supabase.rpc('dev_list_public_tables');
  if (error) throw error;
  return ((data ?? []) as { table_name: string; estimated_rows: number | string }[]).map((r) => ({
    table_name: r.table_name,
    estimated_rows: Number(r.estimated_rows) || 0,
  }));
}

export async function previewTable(
  table: string,
  opts?: { limit?: number; offset?: number },
): Promise<TablePreview> {
  const { data, error } = await supabase.rpc('dev_preview_table', {
    p_table: table,
    p_limit: opts?.limit ?? 40,
    p_offset: opts?.offset ?? 0,
  });
  if (error) throw error;
  const raw = (data ?? {}) as TablePreview;
  const rows = Array.isArray(raw.rows)
    ? raw.rows.map((r) => maskSensitiveRow((r ?? {}) as Record<string, unknown>))
    : [];
  return {
    table: raw.table,
    total: Number(raw.total) || 0,
    limit: Number(raw.limit) || 40,
    offset: Number(raw.offset) || 0,
    rows,
  };
}

export function exportPreviewCsv(table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const flat = rows.map((r) => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      o[k] = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
    return o;
  });
  exportRowsToCsv(flat, `db_${table}_${new Date().toISOString().slice(0, 10)}.csv`);
}

export async function logSandboxAction(opts: {
  action: string;
  target: string;
  meta?: Record<string, unknown>;
  ok?: boolean;
}) {
  const { error } = await supabase.rpc('dev_log_sandbox_action', {
    p_action: opts.action,
    p_target: opts.target,
    p_meta: opts.meta ?? {},
    p_ok: opts.ok ?? true,
  });
  if (error) throw error;
}

export type SystemFlags = {
  maintenance_banner: boolean;
  ai_generate_enabled: boolean;
  whatsapp_send_enabled: boolean;
  jobs_worker_enabled: boolean;
  sandbox_live_calls: boolean;
};

export const DEFAULT_SYSTEM_FLAGS: SystemFlags = {
  maintenance_banner: false,
  ai_generate_enabled: true,
  whatsapp_send_enabled: true,
  jobs_worker_enabled: true,
  sandbox_live_calls: false,
};

export async function getSystemFlags(): Promise<SystemFlags> {
  const { data, error } = await supabase.rpc('dev_get_system_flags');
  if (error) throw error;
  return { ...DEFAULT_SYSTEM_FLAGS, ...(data as Partial<SystemFlags>) };
}

export async function saveSystemFlags(flags: SystemFlags): Promise<void> {
  const { error } = await supabase.rpc('dev_upsert_system_flags', { p_value: flags });
  if (error) throw error;
}

export async function saveFeatureFlagsAsDeveloper(config: { hidden: Record<string, boolean> }) {
  const { error } = await supabase.rpc('dev_upsert_feature_flags', { p_value: config });
  if (error) throw error;
}

/** مهام مجدولة معروفة (توثيق + روابط) */
export const KNOWN_SCHEDULES = [
  {
    id: 'ai-monthly-reset',
    label: 'إعادة رصيد AI الشهري',
    cadence: 'شهري (Cron / Edge)',
    edge: 'ai-monthly-reset',
    notes: 'يتطلب ضبط Cron في Supabase على الدالة',
  },
  {
    id: 'weekly-parent-digest',
    label: 'ملخص أولياء أسبوعي',
    cadence: 'أسبوعي',
    edge: 'weekly-parent-digest',
    notes: 'Edge + إعدادات الإشعارات',
  },
  {
    id: 'whatsapp-reminders',
    label: 'تذكيرات واتساب أكاديمية',
    cadence: 'حسب إعداد المدير + Jobs',
    edge: null,
    notes: 'platform_schedules + jobs-worker (واتساب حي افتراضي؛ dry_run اختياري)',
  },
  {
    id: 'parent-digest-job',
    label: 'ملخص أولياء (Job)',
    cadence: 'أسبوعي / عند الطلب',
    edge: 'weekly-parent-digest',
    notes: 'Job parent_digest حي عبر weekly-parent-digest (dry_run اختياري)',
  },
  {
    id: 'jobs-worker',
    label: 'عامل المهام الخلفية',
    cadence: 'عند الطلب / مجدول لاحقاً',
    edge: 'jobs-worker',
    notes: 'تشغيل يدوي من /dev/jobs حالياً',
  },
  {
    id: 'competition-850',
    label: 'مسابقة يومية 8:50',
    cadence: 'يومياً صباحاً',
    edge: null,
    notes: 'Android TV AlarmManager + شاشات الفصل',
  },
] as const;
