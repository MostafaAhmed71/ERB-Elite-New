import { supabase } from './supabase';

export type ComplianceExportResult = {
  export_id: string;
  export_code: string;
  sha256: string;
  prev_hash: string | null;
  row_count: number;
  logs: Array<{
    id: string;
    user_id: string | null;
    action: string;
    entity: string;
    entity_id: string | null;
    metadata: unknown;
    ip_address: string | null;
    timestamp: string;
  }>;
};

/** P7 — إنشاء تصدير امتثال موقّع بـ SHA-256 */
export async function createComplianceAuditExport(
  startDate?: string,
  endDate?: string,
): Promise<ComplianceExportResult> {
  const p_start = startDate ? `${startDate}T00:00:00Z` : null;
  const p_end = endDate ? `${endDate}T23:59:59Z` : null;

  const { data, error } = await supabase.rpc('create_compliance_audit_export', {
    p_start,
    p_end,
  });
  if (error) throw error;
  return data as ComplianceExportResult;
}

export function downloadComplianceBundle(result: ComplianceExportResult) {
  const manifest = {
    export_code: result.export_code,
    sha256: result.sha256,
    prev_hash: result.prev_hash,
    row_count: result.row_count,
    exported_at: new Date().toISOString(),
    immutable: true,
    note: 'P7 — سجل امتثال غير قابل للتعديل',
  };

  const blob = new Blob(
    [JSON.stringify({ manifest, logs: result.logs }, null, 2)],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${result.export_code}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
