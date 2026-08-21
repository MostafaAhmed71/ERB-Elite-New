import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileSearch, Download, ShieldCheck, RefreshCw } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import {
  getDevAuditStats,
  listAuditLogs,
  parseAuditMeta,
  type AuditLogRow,
} from '../../lib/platformAudit';
import { createComplianceAuditExport, downloadComplianceBundle } from '../../lib/complianceAudit';
import { exportRowsToCsv } from '../../lib/exportExcel';
import { showError, showSuccess } from '../../lib/toast';
import { VirtualizedList } from '../../components/ui/VirtualizedList';
import clsx from 'clsx';

export function DevAuditPage() {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState<AuditLogRow | null>(null);
  const [hours, setHours] = useState(24);

  const statsQuery = useQuery({
    queryKey: ['dev', 'audit', 'stats', hours],
    queryFn: () => getDevAuditStats(hours),
    refetchInterval: 30_000,
    retry: false,
  });

  const logsQuery = useQuery({
    queryKey: ['dev', 'audit', 'logs', startDate, endDate],
    queryFn: () => listAuditLogs({ startDate: startDate || undefined, endDate: endDate || undefined, limit: 250 }),
    refetchInterval: 20_000,
    retry: false,
  });

  const logs = logsQuery.data ?? [];
  const entities = useMemo(() => [...new Set(logs.map((l) => l.entity))].sort(), [logs]);
  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      const hay = [
        log.action,
        log.entity,
        log.entity_id ?? '',
        log.users?.full_name ?? '',
        log.users?.email ?? '',
        log.ip_address ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (entityFilter && log.entity !== entityFilter) return false;
      if (actionFilter && log.action !== actionFilter) return false;
      return true;
    });
  }, [logs, search, entityFilter, actionFilter]);

  const complianceMut = useMutation({
    mutationFn: () => createComplianceAuditExport(startDate || undefined, endDate || undefined),
    onSuccess: (result) => {
      downloadComplianceBundle(result);
      showSuccess(`تصدير امتثال ${result.export_code}`);
      statsQuery.refetch();
    },
    onError: (e: Error) => showError(e),
  });

  const missing =
    logsQuery.error?.message?.includes('permission')
    || logsQuery.error?.message?.includes('policy')
    || statsQuery.error?.message?.includes('platform_developer')
    || statsQuery.error?.message?.includes('dev_audit');

  const meta = parseAuditMeta(selected?.metadata ?? null);

  return (
    <RolePageShell>
      <PageHeader
        title="Audit Center"
        subtitle="مستخدم · عملية · قبل/بعد · جهاز · IP · نتيجة — الموطن الكامل للمطور"
        icon={FileSearch}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={filtered.length === 0}
              onClick={() =>
                exportRowsToCsv(
                  filtered.map((log) => ({
                    المستخدم: log.users?.full_name ?? 'النظام',
                    الدور: log.users?.role ?? '',
                    الإجراء: log.action,
                    الوحدة: log.entity,
                    المعرف: log.entity_id ?? '',
                    IP: log.ip_address ?? '',
                    الوقت: new Date(log.timestamp).toLocaleString('ar-SA'),
                  })),
                  `dev_audit_${new Date().toISOString().slice(0, 10)}.csv`,
                )
              }
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={complianceMut.isPending}
              onClick={() => complianceMut.mutate()}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              امتثال P7
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                logsQuery.refetch();
                statsQuery.refetch();
              }}
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', logsQuery.isFetching && 'animate-spin')} />
              تحديث
            </Button>
          </div>
        }
      />

      {missing && (
        <HorizonCard className="border border-amber-500/30 mb-4">
          <p className="text-sm text-amber-200/90">
            طبّق migration <code className="text-xs">095_questions_import_audit.sql</code> لقراءة التدقيق كمطور.
          </p>
        </HorizonCard>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-surface-muted">نافذة الملخص:</span>
        {[24, 72, 168].map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHours(h)}
            className={clsx(
              'text-xs px-2.5 py-1 rounded-lg border',
              hours === h
                ? 'border-gold-500/40 bg-gold-500/15 text-gold-200'
                : 'border-white/10 text-white/50 hover:text-white',
            )}
          >
            {h === 168 ? '7 أيام' : `${h}س`}
          </button>
        ))}
        <span className="text-xs text-surface-muted ms-auto">عرض المدير: /principal/audit-logs</span>
      </div>

      {statsQuery.data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          {[
            ['الإجمالي', statsQuery.data.total],
            [`آخر ${hours}س`, statsQuery.data.last_period],
            ['تصديرات امتثال', statsQuery.data.compliance_exports],
            ['المعروض', filtered.length],
          ].map(([label, value]) => (
            <HorizonCard key={String(label)} className="!p-3">
              <p className="text-[10px] text-surface-muted">{label}</p>
              <p className="text-xl font-bold text-white tabular-nums mt-1">{value}</p>
            </HorizonCard>
          ))}
        </div>
      )}

      <HorizonCard className="mb-4 !p-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <div className="lg:col-span-2">
            <SearchInput value={search} onChange={setSearch} placeholder="بحث: مستخدم · إجراء · وحدة · IP" />
          </div>
          <select
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">كل الإجراءات</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">كل الوحدات</option>
            {entities.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <div className="flex gap-1">
            <input
              type="date"
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-2 py-2 text-xs text-white"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-2 py-2 text-xs text-white"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </HorizonCard>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-2">
          {logsQuery.isLoading ? (
            <div className="flex justify-center py-16"><TapHandLoader /></div>
          ) : filtered.length === 0 ? (
            <HorizonCard>
              <p className="text-sm text-surface-muted text-center py-10">لا سجلات مطابقة</p>
            </HorizonCard>
          ) : (
            <VirtualizedList
              items={filtered}
              itemHeight={78}
              height={Math.min(560, Math.max(280, filtered.length * 78))}
              threshold={30}
              gap={8}
              keyExtractor={(log) => log.id}
              renderItem={(log) => (
                <button
                  type="button"
                  onClick={() => setSelected(log)}
                  className={clsx(
                    'w-full h-full text-start rounded-2xl border p-3 transition-colors',
                    selected?.id === log.id
                      ? 'border-gold-500/40 bg-gold-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]',
                  )}
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="text-sm text-white font-medium">
                      {log.action}
                      <span className="text-white/40 font-normal"> · {log.entity}</span>
                    </p>
                    <p className="text-[11px] text-white/40">
                      {new Date(log.timestamp).toLocaleString('ar-SA')}
                    </p>
                  </div>
                  <p className="text-xs text-surface-muted mt-1 truncate">
                    {log.users?.full_name ?? 'النظام'}
                    {log.users?.role ? ` (${log.users.role})` : ''}
                    {log.ip_address ? ` · ${log.ip_address}` : ''}
                  </p>
                </button>
              )}
            />
          )}
        </div>

        <div className="lg:col-span-2">
          <HorizonCard className="sticky top-4">
            {!selected ? (
              <p className="text-sm text-surface-muted text-center py-12">اختر سجلاً لعرض التفاصيل</p>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="font-semibold text-white">{selected.action}</p>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-surface-muted">المستخدم</dt>
                    <dd className="text-white/90 text-end">{selected.users?.full_name ?? 'النظام'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-surface-muted">الوحدة</dt>
                    <dd className="text-white/90">{selected.entity}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-surface-muted">المعرف</dt>
                    <dd className="text-white/70 font-mono text-[10px] break-all">{selected.entity_id ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-surface-muted">IP</dt>
                    <dd className="text-white/90">{selected.ip_address ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-surface-muted">الجهاز</dt>
                    <dd className="text-white/90 text-end max-w-[60%] truncate">{meta.device ?? meta.userAgent ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-surface-muted">النتيجة</dt>
                    <dd className="text-white/90">{meta.result ?? '—'}</dd>
                  </div>
                </dl>
                {(meta.before != null || meta.after != null) && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                    <div>
                      <p className="text-[10px] text-surface-muted mb-1">قبل</p>
                      <pre className="text-[10px] text-white/70 bg-black/30 rounded-lg p-2 overflow-auto max-h-40">
                        {JSON.stringify(meta.before, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="text-[10px] text-surface-muted mb-1">بعد</p>
                      <pre className="text-[10px] text-white/70 bg-black/30 rounded-lg p-2 overflow-auto max-h-40">
                        {JSON.stringify(meta.after, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                {selected.metadata && meta.before == null && meta.after == null && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-[10px] text-surface-muted mb-1">metadata</p>
                    <pre className="text-[10px] text-white/70 bg-black/30 rounded-lg p-2 overflow-auto max-h-48">
                      {JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </HorizonCard>
        </div>
      </div>
    </RolePageShell>
  );
}
