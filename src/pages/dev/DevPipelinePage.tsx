import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GitBranch, RefreshCw } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import {
  getKnowledgePipelineStats,
  KNOWLEDGE_STATUS_LABELS,
  knowledgeStatusTone,
  listKnowledgeDocs,
  PIPELINE_STAGES,
  reingestKnowledgeDoc,
  reviewKnowledgeDoc,
} from '../../lib/platformKnowledge';
import { listPlatformJobs } from '../../lib/platformJobs';
import { showError, showSuccess } from '../../lib/toast';
import clsx from 'clsx';

export function DevPipelinePage() {
  const qc = useQueryClient();

  const statsQuery = useQuery({
    queryKey: ['dev', 'pipeline', 'stats'],
    queryFn: getKnowledgePipelineStats,
    refetchInterval: 10_000,
    retry: false,
  });

  const docsQuery = useQuery({
    queryKey: ['dev', 'pipeline', 'docs'],
    queryFn: listKnowledgeDocs,
    refetchInterval: 12_000,
    retry: false,
  });

  const jobsQuery = useQuery({
    queryKey: ['dev', 'pipeline', 'jobs'],
    queryFn: () => listPlatformJobs({ limit: 30 }),
    refetchInterval: 10_000,
    retry: false,
  });

  const reingestMut = useMutation({
    mutationFn: (id: string) => reingestKnowledgeDoc(id),
    onSuccess: () => {
      showSuccess('أُعيدت الفهرسة');
      qc.invalidateQueries({ queryKey: ['dev', 'pipeline'] });
      qc.invalidateQueries({ queryKey: ['dev', 'knowledge'] });
    },
    onError: (e: Error) => showError(e),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      reviewKnowledgeDoc(id, action),
    onSuccess: (_, vars) => {
      showSuccess(vars.action === 'approve' ? 'وُافق على المستند' : 'رُفض المستند');
      qc.invalidateQueries({ queryKey: ['dev', 'pipeline'] });
      qc.invalidateQueries({ queryKey: ['dev', 'knowledge'] });
    },
    onError: (e: Error) => showError(e),
  });

  const stats = statsQuery.data;
  const byStatus = stats?.by_status ?? {};
  const activeDocs = (docsQuery.data ?? []).filter((d) =>
    ['pending', 'processing', 'needs_review', 'failed'].includes(d.status),
  );
  const recentJobs = (jobsQuery.data ?? []).slice(0, 8);

  const missing =
    statsQuery.error?.message?.includes('dev_knowledge_pipeline')
    || statsQuery.error?.message?.includes('schema cache');

  return (
    <RolePageShell>
      <PageHeader
        title="أنبوب معالجة المحتوى"
        subtitle="مراحل · مراجعة بشرية (موافقة/رفض) · Jobs — المرحلة F"
        icon={GitBranch}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/dev/knowledge"
              className="inline-flex items-center justify-center font-semibold px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white"
            >
              قاعدة المعرفة
            </Link>
            <Link
              to="/dev/jobs"
              className="inline-flex items-center justify-center font-semibold px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white"
            >
              Background Jobs
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                statsQuery.refetch();
                docsQuery.refetch();
                jobsQuery.refetch();
              }}
            >
              <RefreshCw
                className={clsx(
                  'w-4 h-4',
                  (statsQuery.isFetching || docsQuery.isFetching) && 'animate-spin',
                )}
              />
              تحديث
            </Button>
          </div>
        }
      />

      {missing && (
        <HorizonCard className="border border-amber-500/30 mb-4">
          <p className="text-sm text-amber-200/90">
            ملخص الأنبوب يتطلب migration <code className="text-xs">094</code>. المراجعة البشرية تتطلب{' '}
            <code className="text-xs">100</code>.
          </p>
        </HorizonCard>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <HorizonCard className="!p-4">
          <p className="text-xs text-surface-muted">مستندات</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.total_docs ?? docsQuery.data?.length ?? '—'}</p>
        </HorizonCard>
        <HorizonCard className="!p-4">
          <p className="text-xs text-surface-muted">مقاطع (Chunks)</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.total_chunks ?? '—'}</p>
        </HorizonCard>
        <HorizonCard className="!p-4">
          <p className="text-xs text-surface-muted">نشط في الأنبوب</p>
          <p className="text-2xl font-bold text-white mt-1">{activeDocs.length}</p>
        </HorizonCard>
      </div>

      <HorizonCard className="mb-6">
        <p className="text-sm font-medium text-white mb-4">مراحل المعالجة</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PIPELINE_STAGES.map((stage, idx) => (
            <div
              key={stage.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 relative"
            >
              {idx < PIPELINE_STAGES.length - 1 && (
                <span className="hidden lg:block absolute -start-2 top-1/2 -translate-y-1/2 text-white/20 text-lg">←</span>
              )}
              <p className="text-[11px] text-surface-muted mb-1">{stage.label}</p>
              <p className={clsx('text-2xl font-bold tabular-nums', knowledgeStatusTone(stage.id).split(' ')[0])}>
                {byStatus[stage.id] ?? (docsQuery.data ?? []).filter((d) => d.status === stage.id).length}
              </p>
              <p className="text-[10px] text-white/40 mt-2 leading-snug">{stage.description}</p>
            </div>
          ))}
        </div>
      </HorizonCard>

      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">يحتاج متابعة</h2>
          {docsQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <TapHandLoader />
            </div>
          ) : activeDocs.length === 0 ? (
            <HorizonCard>
              <p className="text-sm text-surface-muted text-center py-8">لا عناصر معلّقة في الأنبوب</p>
            </HorizonCard>
          ) : (
            <div className="space-y-2">
              {activeDocs.map((d) => (
                <HorizonCard key={d.id} className="!p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{d.title}</p>
                      <span
                        className={clsx(
                          'inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full border',
                          knowledgeStatusTone(d.status),
                        )}
                      >
                        {KNOWLEDGE_STATUS_LABELS[d.status] ?? d.status}
                      </span>
                      {d.error_message && (
                        <p className="text-xs text-red-300/90 mt-2 line-clamp-2">{d.error_message}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {d.status === 'needs_review' && (
                        <>
                          <Button
                            size="sm"
                            disabled={reviewMut.isPending}
                            onClick={() => reviewMut.mutate({ id: d.id, action: 'approve' })}
                          >
                            موافقة
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={reviewMut.isPending}
                            onClick={() => reviewMut.mutate({ id: d.id, action: 'reject' })}
                          >
                            رفض
                          </Button>
                        </>
                      )}
                      {(d.status === 'failed' || d.status === 'needs_review') && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={reingestMut.isPending}
                          onClick={() => reingestMut.mutate(d.id)}
                        >
                          إعادة فهرسة
                        </Button>
                      )}
                    </div>
                  </div>
                </HorizonCard>
              ))}
            </div>
          )}

          {(stats?.failed_docs?.length ?? 0) > 0 && activeDocs.length === 0 && (
            <div className="mt-3 space-y-2">
              {stats!.failed_docs.map((d) => (
                <HorizonCard key={d.id} className="!p-3 border border-red-500/20">
                  <p className="text-sm text-white">{d.title}</p>
                  <p className="text-xs text-red-300/90 mt-1">{d.error_message}</p>
                </HorizonCard>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">آخر المهام (Jobs)</h2>
            <Link to="/dev/jobs" className="text-xs text-gold-400 hover:underline">
              الكل
            </Link>
          </div>
          {jobsQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <TapHandLoader />
            </div>
          ) : recentJobs.length === 0 ? (
            <HorizonCard>
              <p className="text-sm text-surface-muted text-center py-8">
                لا مهام بعد — الفهرسة الحالية عبر Edge مباشرة؛ المهام الخلفية عبر{' '}
                <Link to="/dev/jobs" className="text-gold-400">/dev/jobs</Link>
              </p>
            </HorizonCard>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((j) => (
                <HorizonCard key={j.id} className="!p-3">
                  <p className="text-sm text-white truncate">{j.job_type}</p>
                  <p className="text-xs text-surface-muted mt-1">
                    {j.status}
                    {j.created_at ? ` · ${new Date(j.created_at).toLocaleString('ar-SA')}` : ''}
                  </p>
                </HorizonCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </RolePageShell>
  );
}
