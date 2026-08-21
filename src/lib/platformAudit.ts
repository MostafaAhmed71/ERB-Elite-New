import { supabase } from './supabase';
import type { DbAuditLog } from '../types';

export type AuditLogRow = DbAuditLog & {
  users: { full_name: string; email: string; role: string } | null;
};

export type DevAuditStats = {
  total: number;
  last_period: number;
  by_action: Record<string, number>;
  by_entity: Record<string, number>;
  compliance_exports: number;
};

export type QuestionRepoStats = {
  total: number;
  by_type: Record<string, number>;
  by_difficulty: Record<string, number>;
  skills_with_questions: number;
  versioned: number;
  recent_7d: number;
};

export type ImportExportOverview = {
  file_index_count: number;
  storage_errors_open: number;
  import_related_errors: number;
  failed_jobs: number;
  compliance_exports: number;
  recent_compliance: {
    export_code: string;
    row_count: number;
    sha256_hash: string;
    created_at: string;
  }[];
};

export async function getDevAuditStats(hours = 24): Promise<DevAuditStats> {
  const { data, error } = await supabase.rpc('dev_audit_stats', { p_hours: hours });
  if (error) throw error;
  const raw = (data ?? {}) as DevAuditStats;
  return {
    total: Number(raw.total) || 0,
    last_period: Number(raw.last_period) || 0,
    by_action: raw.by_action && typeof raw.by_action === 'object' ? raw.by_action : {},
    by_entity: raw.by_entity && typeof raw.by_entity === 'object' ? raw.by_entity : {},
    compliance_exports: Number(raw.compliance_exports) || 0,
  };
}

export async function listAuditLogs(opts?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<AuditLogRow[]> {
  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      users (
        full_name,
        email,
        role
      )
    `)
    .order('timestamp', { ascending: false })
    .limit(opts?.limit ?? 200);

  if (opts?.startDate) query = query.gte('timestamp', `${opts.startDate}T00:00:00Z`);
  if (opts?.endDate) query = query.lte('timestamp', `${opts.endDate}T23:59:59Z`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AuditLogRow[];
}

export async function getQuestionRepoStats(): Promise<QuestionRepoStats> {
  const { data, error } = await supabase.rpc('question_repo_stats');
  if (error) throw error;
  const raw = (data ?? {}) as QuestionRepoStats;
  return {
    total: Number(raw.total) || 0,
    by_type: raw.by_type && typeof raw.by_type === 'object' ? raw.by_type : {},
    by_difficulty: raw.by_difficulty && typeof raw.by_difficulty === 'object' ? raw.by_difficulty : {},
    skills_with_questions: Number(raw.skills_with_questions) || 0,
    versioned: Number(raw.versioned) || 0,
    recent_7d: Number(raw.recent_7d) || 0,
  };
}

export async function getImportExportOverview(): Promise<ImportExportOverview> {
  const { data, error } = await supabase.rpc('dev_import_export_overview');
  if (error) throw error;
  const raw = (data ?? {}) as ImportExportOverview;
  return {
    file_index_count: Number(raw.file_index_count) || 0,
    storage_errors_open: Number(raw.storage_errors_open) || 0,
    import_related_errors: Number(raw.import_related_errors) || 0,
    failed_jobs: Number(raw.failed_jobs) || 0,
    compliance_exports: Number(raw.compliance_exports) || 0,
    recent_compliance: Array.isArray(raw.recent_compliance) ? raw.recent_compliance : [],
  };
}

/** استخراج قبل/بعد وجهاز من metadata إن وُجدت */
export function parseAuditMeta(meta: Record<string, unknown> | null | undefined) {
  if (!meta || typeof meta !== 'object') {
    return { before: null, after: null, device: null, result: null, userAgent: null };
  }
  return {
    before: meta.before ?? meta.before_state ?? meta.old ?? null,
    after: meta.after ?? meta.after_state ?? meta.new ?? null,
    device: (meta.device as string) ?? (meta.device_type as string) ?? null,
    result: (meta.result as string) ?? (meta.status as string) ?? (meta.ok != null ? String(meta.ok) : null),
    userAgent: (meta.user_agent as string) ?? (meta.userAgent as string) ?? null,
  };
}
