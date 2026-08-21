import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, RefreshCw } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { getImportExportOverview } from '../../lib/platformAudit';
import { listPlatformJobs } from '../../lib/platformJobs';
import clsx from 'clsx';

export function DevImportExportPage() {
  const overviewQuery = useQuery({
    queryKey: ['dev', 'import-export', 'overview'],
    queryFn: getImportExportOverview,
    refetchInterval: 20_000,
    retry: false,
  });

  const failedJobsQuery = useQuery({
    queryKey: ['dev', 'import-export', 'failed-jobs'],
    queryFn: () => listPlatformJobs({ status: 'failed', limit: 25 }),
    refetchInterval: 15_000,
    retry: false,
  });

  const o = overviewQuery.data;
  const missing =
    overviewQuery.error?.message?.includes('dev_import_export')
    || overviewQuery.error?.message?.includes('platform_file_index');

  return (
    <RolePageShell>
      <PageHeader
        title="مراقبة الاستيراد والتصدير"
        subtitle="فشل Jobs · حجم الفهرس · أخطاء رفع · تصديرات امتثال — دون تنفيذ استيراد مدرسي"
        icon={ArrowLeftRight}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/principal/import-export"
              className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white"
            >
              مركز المدرسة
            </Link>
            <Link
              to="/dev/files"
              className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white"
            >
              الملفات
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                overviewQuery.refetch();
                failedJobsQuery.refetch();
              }}
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', overviewQuery.isFetching && 'animate-spin')} />
              تحديث
            </Button>
          </div>
        }
      />

      {missing && (
        <HorizonCard className="border border-amber-500/30 mb-4">
          <p className="text-sm text-amber-200/90">
            طبّق migrations <code className="text-xs">093–095</code> لتفعيل نظرة الاستيراد/التصدير.
          </p>
        </HorizonCard>
      )}

      {overviewQuery.isLoading ? (
        <div className="flex justify-center py-16"><TapHandLoader /></div>
      ) : o ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-6">
          {[
            ['فهرس الملفات', o.file_index_count],
            ['أخطاء تخزين/رفع', o.storage_errors_open],
            ['أخطاء استيراد محتملة', o.import_related_errors],
            ['Jobs فاشلة', o.failed_jobs],
            ['تصديرات امتثال', o.compliance_exports],
          ].map(([label, value]) => (
            <HorizonCard key={String(label)} className="!p-3">
              <p className="text-[10px] text-surface-muted">{label}</p>
              <p className="text-xl font-bold text-white tabular-nums mt-1">{value}</p>
            </HorizonCard>
          ))}
        </div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">آخر تصديرات الامتثال</h2>
          {(o?.recent_compliance?.length ?? 0) === 0 ? (
            <HorizonCard>
              <p className="text-sm text-surface-muted text-center py-8">لا تصديرات بعد</p>
            </HorizonCard>
          ) : (
            <div className="space-y-2">
              {o!.recent_compliance.map((c) => (
                <HorizonCard key={c.export_code} className="!p-3">
                  <p className="text-sm text-white font-mono">{c.export_code}</p>
                  <p className="text-xs text-surface-muted mt-1">
                    {c.row_count} سجل · {new Date(c.created_at).toLocaleString('ar-SA')}
                  </p>
                  <p className="text-[10px] text-white/40 mt-1 truncate">SHA: {c.sha256_hash}</p>
                </HorizonCard>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Jobs فاشلة</h2>
            <Link to="/dev/jobs" className="text-xs text-gold-400 hover:underline">إدارة المهام</Link>
          </div>
          {failedJobsQuery.isLoading ? (
            <div className="flex justify-center py-10"><TapHandLoader /></div>
          ) : (failedJobsQuery.data ?? []).length === 0 ? (
            <HorizonCard>
              <p className="text-sm text-surface-muted text-center py-8">لا مهام فاشلة</p>
            </HorizonCard>
          ) : (
            <div className="space-y-2">
              {(failedJobsQuery.data ?? []).slice(0, 10).map((j) => (
                <HorizonCard key={j.id} className="!p-3 border border-red-500/15">
                  <p className="text-xs text-white">{j.job_type}</p>
                  <p className="text-[10px] text-red-300/80 mt-1 line-clamp-2">
                    {j.last_error ?? j.status}
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
