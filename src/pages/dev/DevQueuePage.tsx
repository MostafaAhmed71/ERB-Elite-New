import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { getPlatformJobStats, listPlatformJobs, purgeAllPlatformJobs } from '../../lib/platformJobs';
import { showError, showSuccess } from '../../lib/toast';

export function DevQueuePage() {
  const qc = useQueryClient();
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dev', 'queue', 'stats'],
    queryFn: getPlatformJobStats,
    refetchInterval: 5_000,
    retry: false,
  });

  const { data: waiting = [], isLoading: listLoading } = useQuery({
    queryKey: ['dev', 'queue', 'waiting'],
    queryFn: async () => {
      const [queued, retrying] = await Promise.all([
        listPlatformJobs({ status: 'queued', limit: 30 }),
        listPlatformJobs({ status: 'retrying', limit: 30 }),
      ]);
      return [...queued, ...retrying].sort(
        (a, b) => a.priority - b.priority || a.created_at.localeCompare(b.created_at),
      );
    },
    refetchInterval: 5_000,
    retry: false,
  });

  const depth = useMemo(
    () => (stats ? stats.queued + stats.retrying : 0),
    [stats],
  );

  const purgeMut = useMutation({
    mutationFn: purgeAllPlatformJobs,
    onSuccess: (n) => {
      showSuccess(n > 0 ? `حُذفت ${n} مهمة — الطابور فارغ` : 'الطابور فارغ مسبقاً');
      qc.invalidateQueries({ queryKey: ['dev', 'queue'] });
      qc.invalidateQueries({ queryKey: ['dev', 'jobs'] });
    },
    onError: (e: Error) => showError(e),
  });

  return (
    <RolePageShell>
      <PageHeader
        title="Queue Monitor"
        subtitle="عمق الطابور والمهام المنتظرة — مرتبط بـ Background Jobs"
        icon={Layers}
        actions={
          <Button
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => {
              if (confirm('حذف جميع مهام طابور المنصة؟ لا يمكن التراجع.')) {
                purgeMut.mutate();
              }
            }}
            disabled={purgeMut.isPending || !!statsError}
          >
            {purgeMut.isPending ? 'جاري الحذف…' : 'حذف كل المهام'}
          </Button>
        }
      />

      {statsError ? (
        <HorizonCard className="border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-100">
            الطابور يعتمد على جدول المهام. طبّق{' '}
            <code className="text-white/80">092_platform_jobs.sql</code> أو افتح{' '}
            <Link to="/dev/jobs" className="text-gold-400 underline">Jobs</Link>.
          </p>
        </HorizonCard>
      ) : statsLoading ? (
        <TapHandLoader label="جاري قياس عمق الطابور..." />
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <HorizonCard className="border border-white/8">
              <p className="text-xs text-surface-muted">عمق الانتظار</p>
              <p className="text-3xl font-bold text-gold-400 tabular-nums mt-1">{depth}</p>
            </HorizonCard>
            <HorizonCard className="border border-white/8">
              <p className="text-xs text-surface-muted">قيد التنفيذ</p>
              <p className="text-3xl font-bold text-cyan-300 tabular-nums mt-1">{stats?.running ?? 0}</p>
            </HorizonCard>
            <HorizonCard className="border border-white/8">
              <p className="text-xs text-surface-muted">فشل معلّق</p>
              <p className="text-3xl font-bold text-red-300 tabular-nums mt-1">{stats?.failed ?? 0}</p>
            </HorizonCard>
          </div>

          <HorizonCard>
            <p className="text-sm font-bold text-white mb-3">رأس الطابور</p>
            {listLoading ? (
              <TapHandLoader label="..." />
            ) : waiting.length === 0 ? (
              <p className="text-sm text-emerald-300/90">الطابور فارغ</p>
            ) : (
              <ul className="space-y-2">
                {waiting.slice(0, 15).map((j, i) => (
                  <li
                    key={j.id}
                    className="flex items-center justify-between gap-2 text-sm border-b border-white/5 pb-2"
                  >
                    <span className="text-white/40 tabular-nums w-6">#{i + 1}</span>
                    <span className="font-mono text-white flex-1 truncate">{j.job_type}</span>
                    <span className="text-xs text-surface-muted">أولوية {j.priority}</span>
                  </li>
                ))}
              </ul>
            )}
          </HorizonCard>
        </>
      )}
    </RolePageShell>
  );
}
