import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, RefreshCw } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { HubTabs, type HubTabItem } from '../../components/ui/HubTabs';
import { aiCreditsService } from '../../lib/ai/aiAssistantService';
import { listDevAiGenerations } from '../../lib/platformKnowledge';
import clsx from 'clsx';

type GenFilter = 'all' | 'success' | 'failed';

const GEN_FILTERS: HubTabItem<GenFilter>[] = [
  { id: 'all', label: 'الكل' },
  { id: 'success', label: 'نجاح' },
  { id: 'failed', label: 'فشل' },
];

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function DevAiUsagePage() {
  const [rangeDays, setRangeDays] = useState(30);
  const [genFilter, setGenFilter] = useState<GenFilter>('all');

  const statsQuery = useQuery({
    queryKey: ['dev', 'ai', 'usage', rangeDays],
    queryFn: () => aiCreditsService.usageStats(daysAgoIso(rangeDays)),
    refetchInterval: 30_000,
    retry: false,
  });

  const gensQuery = useQuery({
    queryKey: ['dev', 'ai', 'generations', genFilter],
    queryFn: () =>
      listDevAiGenerations({
        limit: 50,
        status: genFilter === 'all' ? null : genFilter,
      }),
    refetchInterval: 20_000,
    retry: false,
  });

  const stats = statsQuery.data;
  const successRate = useMemo(() => {
    if (!stats) return null;
    const total = stats.success_count + stats.failed_count;
    if (!total) return null;
    return Math.round((stats.success_count / total) * 100);
  }, [stats]);

  const missing =
    statsQuery.error?.message?.includes('FORBIDDEN')
    || statsQuery.error?.message?.includes('ai_usage_stats')
    || gensQuery.error?.message?.includes('platform_developer')
    || gensQuery.error?.message?.includes('dev_ai_generations');

  return (
    <RolePageShell>
      <PageHeader
        title="مراقبة استخدام AI"
        subtitle="طلبات · مزودون · أخطاء · زمن الاستجابة — عمق تشغيلي للمطور"
        icon={BarChart3}
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white"
              value={rangeDays}
              onChange={(e) => setRangeDays(Number(e.target.value))}
            >
              <option value={7}>آخر 7 أيام</option>
              <option value={30}>آخر 30 يوماً</option>
              <option value={90}>آخر 90 يوماً</option>
            </select>
            <Link
              to="/dev/knowledge"
              className="inline-flex items-center justify-center font-semibold px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white"
            >
              المعرفة
            </Link>
            <Link
              to="/dev/errors"
              className="inline-flex items-center justify-center font-semibold px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white"
            >
              الأخطاء
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                statsQuery.refetch();
                gensQuery.refetch();
              }}
            >
              <RefreshCw className={clsx('w-4 h-4', (statsQuery.isFetching || gensQuery.isFetching) && 'animate-spin')} />
              تحديث
            </Button>
          </div>
        }
      />

      {missing && (
        <HorizonCard className="border border-amber-500/30 mb-4">
          <p className="text-sm text-amber-200/90">
            RPC الاستخدام غير متاح للمطور — طبّق migration <code className="text-xs">094</code>.
          </p>
        </HorizonCard>
      )}

      {statsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <TapHandLoader />
        </div>
      ) : stats ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'نجاح', value: stats.success_count },
              { label: 'فشل', value: stats.failed_count },
              { label: 'معدل النجاح', value: successRate != null ? `${successRate}%` : '—' },
              { label: 'متوسط الزمن', value: `${stats.avg_execution_ms} ms` },
              { label: 'رصيد مستهلك', value: stats.total_credits },
              { label: 'Tokens', value: stats.total_tokens },
              { label: 'تكلفة تقديرية', value: `$${Number(stats.total_cost_usd).toFixed(4)}` },
            ].map((s) => (
              <HorizonCard key={s.label} className="!p-4">
                <p className="text-xs text-surface-muted">{s.label}</p>
                <p className="text-xl font-bold text-white mt-1 tabular-nums">{s.value}</p>
              </HorizonCard>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-3 mb-6">
            <HorizonCard>
              <p className="text-sm font-medium text-white mb-3">أكثر المهام</p>
              <ul className="space-y-2">
                {(stats.top_tasks ?? []).length === 0 && (
                  <li className="text-xs text-surface-muted">لا بيانات</li>
                )}
                {(stats.top_tasks ?? []).map((t) => (
                  <li key={t.task_code} className="flex justify-between text-xs gap-2">
                    <span className="text-white/80 truncate">{t.task_code}</span>
                    <span className="text-surface-muted shrink-0">{t.cnt} · {t.credits} رصيد</span>
                  </li>
                ))}
              </ul>
            </HorizonCard>
            <HorizonCard>
              <p className="text-sm font-medium text-white mb-3">أكثر المعلمين استخداماً</p>
              <ul className="space-y-2">
                {(stats.top_teachers ?? []).length === 0 && (
                  <li className="text-xs text-surface-muted">لا بيانات</li>
                )}
                {(stats.top_teachers ?? []).map((t) => (
                  <li key={t.teacher_id} className="flex justify-between text-xs gap-2">
                    <span className="text-white/80 truncate">{t.full_name || '—'}</span>
                    <span className="text-surface-muted shrink-0">{t.cnt}</span>
                  </li>
                ))}
              </ul>
            </HorizonCard>
            <HorizonCard>
              <p className="text-sm font-medium text-white mb-3">المواد</p>
              <ul className="space-y-2">
                {(stats.top_subjects ?? []).length === 0 && (
                  <li className="text-xs text-surface-muted">لا بيانات</li>
                )}
                {(stats.top_subjects ?? []).map((t) => (
                  <li key={t.subject} className="flex justify-between text-xs gap-2">
                    <span className="text-white/80 truncate">{t.subject}</span>
                    <span className="text-surface-muted shrink-0">{t.cnt}</span>
                  </li>
                ))}
              </ul>
            </HorizonCard>
          </div>
        </>
      ) : (
        <HorizonCard className="mb-4">
          <p className="text-sm text-surface-muted text-center py-6">تعذّر تحميل الإحصاءات</p>
        </HorizonCard>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-white">آخر التوليدات</h2>
        <HubTabs tabs={GEN_FILTERS} activeId={genFilter} onChange={setGenFilter} ariaLabel="تصفية التوليدات" />
      </div>

      {gensQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <TapHandLoader />
        </div>
      ) : (gensQuery.data ?? []).length === 0 ? (
        <HorizonCard>
          <p className="text-sm text-surface-muted text-center py-8">لا توليدات</p>
        </HorizonCard>
      ) : (
        <div className="space-y-2">
          {(gensQuery.data ?? []).map((g) => (
            <HorizonCard key={g.id} className="!p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {g.task_code}
                    <span
                      className={clsx(
                        'ms-2 text-[11px] px-2 py-0.5 rounded-full border',
                        g.status === 'success'
                          ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                          : g.status === 'failed'
                            ? 'text-red-300 border-red-500/30 bg-red-500/10'
                            : 'text-white/60 border-white/10 bg-white/5',
                      )}
                    >
                      {g.status}
                    </span>
                  </p>
                  <p className="text-xs text-surface-muted mt-1">
                    {g.teacher_name || '—'}
                    {g.model ? ` · ${g.model}` : ''}
                    {g.provider ? ` · ${g.provider}` : ''}
                    {g.execution_time_ms != null ? ` · ${g.execution_time_ms} ms` : ''}
                  </p>
                  {g.error_message && (
                    <p className="text-xs text-red-300/90 mt-1 line-clamp-2">{g.error_message}</p>
                  )}
                </div>
                <p className="text-[11px] text-white/40 shrink-0">
                  {new Date(g.created_at).toLocaleString('ar-SA')}
                </p>
              </div>
            </HorizonCard>
          ))}
        </div>
      )}
    </RolePageShell>
  );
}
