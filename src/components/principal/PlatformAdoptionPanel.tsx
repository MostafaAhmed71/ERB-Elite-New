import { useQuery } from '@tanstack/react-query';
import { Users, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { fetchPlatformAdoptionStats, ADOPTION_ROLE_LABELS } from '../../lib/platformAdoption';
import { TapHandLoader } from '../ui/TapHandLoader';

export function PlatformAdoptionPanel() {
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['platform-adoption'],
    queryFn: fetchPlatformAdoptionStats,
    refetchInterval: 120_000,
  });

  if (isLoading) {
    return <TapHandLoader label="جاري تحميل إحصائيات التبنّي..." />;
  }

  const overallWeek =
    stats.length > 0
      ? Math.round(stats.reduce((s, r) => s + r.week_pct, 0) / stats.length)
      : 0;

  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-[#111c44]/80 backdrop-blur-sm p-5 shadow-lg space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-white font-semibold text-base">تبنّي المنصة — P6</h3>
            <p className="text-white/40 text-xs">نسبة الدخول خلال آخر 7 أيام حسب الدور</p>
          </div>
        </div>
        <div className="text-center px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <p className="text-cyan-300 text-2xl font-black font-mono">{overallWeek}%</p>
          <p className="text-white/30 text-[10px]">متوسط أسبوعي</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {stats.map((row) => (
          <div
            key={row.role}
            className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-medium">
                {ADOPTION_ROLE_LABELS[row.role] ?? row.role}
              </span>
              <span
                className={clsx(
                  'text-xs font-mono font-bold',
                  row.week_pct >= 70 && 'text-emerald-400',
                  row.week_pct >= 40 && row.week_pct < 70 && 'text-amber-400',
                  row.week_pct < 40 && 'text-red-400',
                )}
              >
                {row.week_pct}%
              </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all',
                  row.week_pct >= 70 && 'bg-emerald-500',
                  row.week_pct >= 40 && row.week_pct < 70 && 'bg-amber-500',
                  row.week_pct < 40 && 'bg-red-500',
                )}
                style={{ width: `${Math.min(row.week_pct, 100)}%` }}
              />
            </div>
            <p className="text-white/35 text-[10px] flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {row.active_week}/{row.total} هذا الأسبوع · {row.active_month} خلال 30 يوماً
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
