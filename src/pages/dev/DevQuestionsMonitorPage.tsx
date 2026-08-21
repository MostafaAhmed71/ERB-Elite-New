import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HelpCircle, RefreshCw } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { getQuestionRepoStats } from '../../lib/platformAudit';
import { listPlatformErrors } from '../../lib/platformErrors';
import { listPlatformJobs } from '../../lib/platformJobs';
import { QUESTION_TYPE_LABELS } from '../../lib/questionGrading';
import clsx from 'clsx';

const DIFF_LABELS: Record<string, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
};

export function DevQuestionsMonitorPage() {
  const statsQuery = useQuery({
    queryKey: ['dev', 'questions', 'stats'],
    queryFn: getQuestionRepoStats,
    refetchInterval: 30_000,
    retry: false,
  });

  const errorsQuery = useQuery({
    queryKey: ['dev', 'questions', 'errors'],
    queryFn: () => listPlatformErrors({ openOnly: true, limit: 40 }),
    refetchInterval: 20_000,
    retry: false,
  });

  const jobsQuery = useQuery({
    queryKey: ['dev', 'questions', 'jobs'],
    queryFn: () => listPlatformJobs({ status: 'failed', limit: 20 }),
    refetchInterval: 20_000,
    retry: false,
  });

  const relatedErrors = (errorsQuery.data ?? []).filter((e) => {
    const blob = `${e.message} ${JSON.stringify(e.context ?? {})}`.toLowerCase();
    return /question|سؤال|qti|ocr|exam|اختبار|بنك/.test(blob);
  });

  const stats = statsQuery.data;
  const missing =
    statsQuery.error?.message?.includes('question_repo')
    || statsQuery.error?.message?.includes('FORBIDDEN');

  return (
    <RolePageShell>
      <PageHeader
        title="مراقبة مستودع الأسئلة"
        subtitle="إحصاءات المستودع المدرسي · أخطاء مرتبطة · Jobs فاشلة — بدون تعديل تربوي"
        icon={HelpCircle}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/questions"
              className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white"
            >
              صفحة المشرف
            </Link>
            <Link
              to="/dev/errors"
              className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white"
            >
              الأخطاء
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                statsQuery.refetch();
                errorsQuery.refetch();
                jobsQuery.refetch();
              }}
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', statsQuery.isFetching && 'animate-spin')} />
              تحديث
            </Button>
          </div>
        }
      />

      {missing && (
        <HorizonCard className="border border-amber-500/30 mb-4">
          <p className="text-sm text-amber-200/90">
            طبّق migration <code className="text-xs">095</code> لتفعيل <code className="text-xs">question_repo_stats</code>.
          </p>
        </HorizonCard>
      )}

      {statsQuery.isLoading ? (
        <div className="flex justify-center py-16"><TapHandLoader /></div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
            {[
              ['الإجمالي', stats.total],
              ['مهارات مغطاة', stats.skills_with_questions],
              ['إصدارات', stats.versioned],
              ['آخر 7 أيام', stats.recent_7d],
              ['أخطاء مرتبطة', relatedErrors.length],
              ['Jobs فاشلة', jobsQuery.data?.length ?? 0],
            ].map(([label, value]) => (
              <HorizonCard key={String(label)} className="!p-3">
                <p className="text-[10px] text-surface-muted">{label}</p>
                <p className="text-xl font-bold text-white tabular-nums mt-1">{value}</p>
              </HorizonCard>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <HorizonCard>
              <p className="text-sm font-medium text-white mb-3">حسب النوع</p>
              <ul className="space-y-2">
                {Object.entries(stats.by_type).length === 0 && (
                  <li className="text-xs text-surface-muted">لا بيانات</li>
                )}
                {Object.entries(stats.by_type).map(([type, cnt]) => (
                  <li key={type} className="flex justify-between text-xs">
                    <span className="text-white/80">
                      {(QUESTION_TYPE_LABELS as Record<string, string>)[type] ?? type}
                    </span>
                    <span className="text-surface-muted tabular-nums">{cnt}</span>
                  </li>
                ))}
              </ul>
            </HorizonCard>
            <HorizonCard>
              <p className="text-sm font-medium text-white mb-3">حسب الصعوبة</p>
              <ul className="space-y-2">
                {Object.entries(stats.by_difficulty).length === 0 && (
                  <li className="text-xs text-surface-muted">لا بيانات</li>
                )}
                {Object.entries(stats.by_difficulty).map(([d, cnt]) => (
                  <li key={d} className="flex justify-between text-xs">
                    <span className="text-white/80">{DIFF_LABELS[d] ?? d}</span>
                    <span className="text-surface-muted tabular-nums">{cnt}</span>
                  </li>
                ))}
              </ul>
            </HorizonCard>
          </div>
        </>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">أخطاء قد تتعلق بالأسئلة</h2>
          {relatedErrors.length === 0 ? (
            <HorizonCard>
              <p className="text-sm text-surface-muted text-center py-8">لا أخطاء مفتوحة مرتبطة</p>
            </HorizonCard>
          ) : (
            <div className="space-y-2">
              {relatedErrors.slice(0, 8).map((e) => (
                <HorizonCard key={e.id} className="!p-3">
                  <p className="text-xs text-white line-clamp-2">{e.message}</p>
                  <p className="text-[10px] text-surface-muted mt-1">{e.source} · {e.severity}</p>
                </HorizonCard>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="flex justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Jobs فاشلة (عينة)</h2>
            <Link to="/dev/jobs" className="text-xs text-gold-400 hover:underline">الكل</Link>
          </div>
          {(jobsQuery.data ?? []).length === 0 ? (
            <HorizonCard>
              <p className="text-sm text-surface-muted text-center py-8">لا مهام فاشلة</p>
            </HorizonCard>
          ) : (
            <div className="space-y-2">
              {(jobsQuery.data ?? []).slice(0, 8).map((j) => (
                <HorizonCard key={j.id} className="!p-3">
                  <p className="text-xs text-white">{j.job_type}</p>
                  <p className="text-[10px] text-red-300/80 mt-1 line-clamp-2">{j.last_error ?? j.status}</p>
                </HorizonCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </RolePageShell>
  );
}
