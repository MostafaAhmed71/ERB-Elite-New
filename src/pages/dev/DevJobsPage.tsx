import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListOrdered, Play, RefreshCw, XCircle, RotateCcw } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { HubTabs, type HubTabItem } from '../../components/ui/HubTabs';
import {
  cancelPlatformJob,
  enqueuePlatformJob,
  getPlatformJobStats,
  invokeJobsWorker,
  KNOWN_JOB_TYPES,
  listPlatformJobEvents,
  listPlatformJobs,
  platformJobStatusLabel,
  retryPlatformJob,
  type PlatformJob,
  type PlatformJobStatus,
} from '../../lib/platformJobs';
import { showError, showSuccess } from '../../lib/toast';
import clsx from 'clsx';

type Filter = 'all' | PlatformJobStatus;

const FILTERS: HubTabItem<Filter>[] = [
  { id: 'all', label: 'الكل' },
  { id: 'queued', label: 'انتظار' },
  { id: 'running', label: 'تشغيل' },
  { id: 'failed', label: 'فشل' },
  { id: 'succeeded', label: 'نجاح' },
];

function statusTone(status: PlatformJobStatus) {
  if (status === 'succeeded') return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/25';
  if (status === 'failed') return 'text-red-300 bg-red-500/15 border-red-500/25';
  if (status === 'running') return 'text-cyan-300 bg-cyan-500/15 border-cyan-500/25';
  if (status === 'cancelled') return 'text-white/50 bg-white/5 border-white/10';
  if (status === 'retrying') return 'text-amber-300 bg-amber-500/15 border-amber-500/25';
  return 'text-gold-300 bg-gold-500/10 border-gold-500/20';
}

export function DevJobsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enqueueType, setEnqueueType] = useState<string>(KNOWN_JOB_TYPES[0].id);
  /** اختياري — الحي افتراضي لمهام واتساب/ملخص */
  const [dryRun, setDryRun] = useState(false);

  const jobsQuery = useQuery({
    queryKey: ['dev', 'jobs', filter],
    queryFn: () => listPlatformJobs({ status: filter, limit: 80 }),
    refetchInterval: 8_000,
    retry: false,
  });

  const statsQuery = useQuery({
    queryKey: ['dev', 'jobs', 'stats'],
    queryFn: getPlatformJobStats,
    refetchInterval: 8_000,
    retry: false,
  });

  const eventsQuery = useQuery({
    queryKey: ['dev', 'jobs', 'events', selectedId],
    queryFn: () => listPlatformJobEvents(selectedId!),
    enabled: !!selectedId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['dev', 'jobs'] });
    qc.invalidateQueries({ queryKey: ['dev', 'health', 'jobs'] });
  };

  const enqueueMut = useMutation({
    mutationFn: () => {
      const base = { source: 'dev-ui', at: new Date().toISOString() };
      const payload =
        enqueueType === 'whatsapp_reminder' || enqueueType === 'academic_reminder'
          ? {
              ...base,
              dry_run: dryRun,
              kind: enqueueType === 'academic_reminder' ? 'homework' : 'general',
              targets: [],
            }
          : enqueueType === 'parent_digest'
            ? { ...base, dry_run: dryRun }
            : base;
      return enqueuePlatformJob(enqueueType, payload);
    },
    onSuccess: (id) => {
      showSuccess(`أُنشئت المهمة ${id.slice(0, 8)}…`);
      invalidate();
      setSelectedId(id);
    },
    onError: (e: Error) => showError(e),
  });

  const workerMut = useMutation({
    mutationFn: () => invokeJobsWorker(),
    onSuccess: (data) => {
      showSuccess(`العامل عالج ${data.claimed ?? 0} مهمة`);
      invalidate();
    },
    onError: (e: Error) => showError(e),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelPlatformJob(id),
    onSuccess: () => {
      showSuccess('أُلغيت المهمة');
      invalidate();
    },
    onError: (e: Error) => showError(e),
  });

  const retryMut = useMutation({
    mutationFn: (id: string) => retryPlatformJob(id),
    onSuccess: () => {
      showSuccess('أُعيدت للطابور');
      invalidate();
    },
    onError: (e: Error) => showError(e),
  });

  const selected = useMemo(
    () => (jobsQuery.data ?? []).find((j) => j.id === selectedId) ?? null,
    [jobsQuery.data, selectedId],
  );

  const missingTable =
    jobsQuery.error?.message?.includes('platform_jobs')
    || jobsQuery.error?.message?.includes('schema cache')
    || statsQuery.error?.message?.includes('platform_jobs');

  return (
    <RolePageShell>
      <PageHeader
        title="Background Jobs"
        subtitle="طابور مهام المنصة — إنشاء · تشغيل عامل · إلغاء · إعادة محاولة"
        icon={ListOrdered}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<Play className="w-4 h-4" />}
              onClick={() => workerMut.mutate()}
              disabled={workerMut.isPending || !!missingTable}
            >
              تشغيل العامل
            </Button>
            <Button
              variant="secondary"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={() => invalidate()}
            >
              تحديث
            </Button>
          </div>
        }
      />

      {missingTable && (
        <HorizonCard className="border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-100">
            جدول <code className="text-white/80">platform_jobs</code> غير موجود بعد. طبّق migration{' '}
            <code className="text-white/80">092_platform_jobs.sql</code> على Supabase ثم أعد تحميل الصفحة.
          </p>
        </HorizonCard>
      )}

      {statsQuery.data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {(
            [
              ['queued', 'انتظار'],
              ['running', 'تشغيل'],
              ['retrying', 'إعادة'],
              ['failed', 'فشل'],
              ['succeeded', 'نجاح'],
              ['total', 'الإجمالي'],
            ] as const
          ).map(([key, label]) => (
            <HorizonCard key={key} padding="sm" className="border border-white/5">
              <p className="text-[10px] text-surface-muted">{label}</p>
              <p className="text-xl font-bold text-white tabular-nums mt-1">{statsQuery.data[key]}</p>
            </HorizonCard>
          ))}
        </div>
      )}

      <HorizonCard className="border border-white/8">
        <p className="text-sm font-semibold text-white mb-3">إنشاء مهمة اختبار</p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <label className="flex-1 text-xs text-surface-muted">
            النوع
            <select
              value={enqueueType}
              onChange={(e) => setEnqueueType(e.target.value)}
              className="mt-1 w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
            >
              {KNOWN_JOB_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            onClick={() => enqueueMut.mutate()}
            disabled={enqueueMut.isPending || !!missingTable}
          >
            إضافة للطابور
          </Button>
        </div>
        {(enqueueType === 'whatsapp_reminder'
          || enqueueType === 'academic_reminder'
          || enqueueType === 'parent_digest') && (
          <label className="flex items-center gap-2 text-xs text-surface-muted mt-3">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
            />
            dry-run فقط (بدون إرسال حي) — الحي هو الافتراضي ويحترم whatsapp_send_enabled
          </label>
        )}
        <p className="text-xs text-surface-muted mt-2">
          {KNOWN_JOB_TYPES.find((t) => t.id === enqueueType)?.description}
        </p>
      </HorizonCard>

      <HubTabs tabs={FILTERS} activeId={filter} onChange={setFilter} ariaLabel="تصفية المهام" />

      {jobsQuery.isLoading ? (
        <TapHandLoader label="جاري تحميل المهام..." />
      ) : (
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 space-y-2">
            {(jobsQuery.data ?? []).length === 0 ? (
              <HorizonCard>
                <p className="text-sm text-surface-muted text-center py-6">لا مهام في هذا التصفية</p>
              </HorizonCard>
            ) : (
              (jobsQuery.data ?? []).map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  active={job.id === selectedId}
                  onSelect={() => setSelectedId(job.id)}
                  onCancel={() => cancelMut.mutate(job.id)}
                  onRetry={() => retryMut.mutate(job.id)}
                  busy={cancelMut.isPending || retryMut.isPending}
                />
              ))
            )}
          </div>

          <div className="lg:col-span-2">
            <HorizonCard className="border border-white/8 sticky top-2">
              <p className="text-sm font-bold text-white mb-3">التفاصيل والسجل</p>
              {!selected ? (
                <p className="text-xs text-surface-muted">اختر مهمة من القائمة</p>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs space-y-1 text-surface-muted">
                    <p>
                      <span className="text-white/50">النوع: </span>
                      <span className="text-white font-mono">{selected.job_type}</span>
                    </p>
                    <p>
                      <span className="text-white/50">المحاولات: </span>
                      {selected.attempts}/{selected.max_attempts}
                    </p>
                    {selected.last_error && (
                      <p className="text-red-300/90 break-words">{selected.last_error}</p>
                    )}
                    {selected.result && (
                      <pre className="text-[10px] bg-black/30 rounded-lg p-2 overflow-auto max-h-32 text-emerald-200/80">
                        {JSON.stringify(selected.result, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div className="border-t border-white/8 pt-3 space-y-2 max-h-64 overflow-y-auto">
                    {eventsQuery.isLoading ? (
                      <TapHandLoader label="سجل الأحداث..." />
                    ) : (eventsQuery.data ?? []).length === 0 ? (
                      <p className="text-xs text-surface-muted">لا أحداث</p>
                    ) : (
                      (eventsQuery.data ?? []).map((ev) => (
                        <div key={ev.id} className="text-xs border-b border-white/5 pb-2">
                          <p
                            className={clsx(
                              'font-medium',
                              ev.level === 'error'
                                ? 'text-red-300'
                                : ev.level === 'warn'
                                  ? 'text-amber-300'
                                  : 'text-white/80',
                            )}
                          >
                            {ev.message}
                          </p>
                          <p className="text-white/30 mt-0.5">
                            {new Date(ev.created_at).toLocaleString('ar-SA')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </HorizonCard>
          </div>
        </div>
      )}
    </RolePageShell>
  );
}

function JobRow({
  job,
  active,
  onSelect,
  onCancel,
  onRetry,
  busy,
}: {
  job: PlatformJob;
  active: boolean;
  onSelect: () => void;
  onCancel: () => void;
  onRetry: () => void;
  busy: boolean;
}) {
  const canCancel = ['queued', 'running', 'retrying'].includes(job.status);
  const canRetry = ['failed', 'cancelled'].includes(job.status);

  return (
    <div
      className={clsx(
        'rounded-xl border px-3 py-2.5 transition-colors',
        active ? 'border-gold-500/40 bg-gold-500/10' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.05]',
      )}
    >
      <button type="button" onClick={onSelect} className="w-full text-right">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white font-mono truncate">{job.job_type}</p>
            <p className="text-[10px] text-white/35 mt-0.5 font-mono truncate">{job.id}</p>
          </div>
          <span className={clsx('text-[10px] px-2 py-0.5 rounded-full border shrink-0', statusTone(job.status))}>
            {platformJobStatusLabel(job.status)}
          </span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gold-500/80 rounded-full transition-all"
            style={{ width: `${job.progress}%` }}
          />
        </div>
        <p className="text-[10px] text-surface-muted mt-1">
          {new Date(job.created_at).toLocaleString('ar-SA')} · أولوية {job.priority}
        </p>
      </button>
      {(canCancel || canRetry) && (
        <div className="flex gap-2 mt-2 justify-end">
          {canRetry && (
            <button
              type="button"
              disabled={busy}
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-white/5 text-white/70 hover:bg-white/10"
            >
              <RotateCcw className="w-3 h-3" /> إعادة
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20"
            >
              <XCircle className="w-3 h-3" /> إلغاء
            </button>
          )}
        </div>
      )}
    </div>
  );
}
