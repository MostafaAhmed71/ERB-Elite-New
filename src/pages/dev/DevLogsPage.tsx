import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, RefreshCw } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { listPlatformErrors } from '../../lib/platformErrors';
import { listPlatformJobs } from '../../lib/platformJobs';
import { listAuditLogs } from '../../lib/platformAudit';
import clsx from 'clsx';

export function DevLogsPage() {
  const errorsQuery = useQuery({
    queryKey: ['dev', 'logs', 'errors'],
    queryFn: () => listPlatformErrors({ openOnly: false, limit: 30 }),
    refetchInterval: 20_000,
    retry: false,
  });

  const jobsQuery = useQuery({
    queryKey: ['dev', 'logs', 'jobs'],
    queryFn: () => listPlatformJobs({ limit: 20 }),
    refetchInterval: 20_000,
    retry: false,
  });

  const auditQuery = useQuery({
    queryKey: ['dev', 'logs', 'audit'],
    queryFn: () => listAuditLogs({ limit: 25 }),
    refetchInterval: 30_000,
    retry: false,
  });

  return (
    <RolePageShell>
      <PageHeader
        title="السجلات"
        subtitle="تجميع من Errors · Jobs · Audit — بدون أسرار"
        icon={ScrollText}
        actions={
          <div className="flex gap-2">
            <Link
              to="/dev/errors"
              className="inline-flex px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white/70"
            >
              مركز الأخطاء
            </Link>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                errorsQuery.refetch();
                jobsQuery.refetch();
                auditQuery.refetch();
              }}
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', errorsQuery.isFetching && 'animate-spin')} />
              تحديث
            </Button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <section>
          <h2 className="text-sm font-semibold text-white mb-2">أخطاء حديثة</h2>
          {errorsQuery.isLoading ? (
            <TapHandLoader />
          ) : (
            <div className="space-y-2">
              {(errorsQuery.data ?? []).slice(0, 12).map((e) => (
                <HorizonCard key={e.id} className="!p-3">
                  <p className="text-xs text-white line-clamp-2">{e.message}</p>
                  <p className="text-[10px] text-surface-muted mt-1">
                    {e.source} · {e.severity}
                    {e.resolved_at ? ' · مُغلق' : ''}
                  </p>
                </HorizonCard>
              ))}
              {(errorsQuery.data ?? []).length === 0 && (
                <HorizonCard>
                  <p className="text-xs text-surface-muted text-center py-6">لا سجلات</p>
                </HorizonCard>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-white mb-2">آخر Jobs</h2>
          <div className="space-y-2">
            {(jobsQuery.data ?? []).slice(0, 12).map((j) => (
              <HorizonCard key={j.id} className="!p-3">
                <p className="text-xs text-white">{j.job_type}</p>
                <p className="text-[10px] text-surface-muted mt-1">
                  {j.status}
                  {j.last_error ? ` · ${j.last_error}` : ''}
                </p>
              </HorizonCard>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-white mb-2">Audit مختصر</h2>
          <div className="space-y-2">
            {(auditQuery.data ?? []).slice(0, 12).map((a) => (
              <HorizonCard key={a.id} className="!p-3">
                <p className="text-xs text-white truncate">
                  {a.action} · {a.entity}
                </p>
                <p className="text-[10px] text-surface-muted mt-1">
                  {new Date(a.timestamp).toLocaleString('ar-SA')}
                </p>
              </HorizonCard>
            ))}
          </div>
        </section>
      </div>
    </RolePageShell>
  );
}
