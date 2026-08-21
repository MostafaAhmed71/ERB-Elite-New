import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { buildVelocitySummary, buildAxisBreakdown } from '../../lib/pointsAnalytics';
import { DailyPointsBarChart } from './charts/DailyPointsBarChart';
import { PointsVelocityLineChart } from './charts/PointsVelocityLineChart';
import { AxisBreakdownChart } from './charts/AxisBreakdownChart';
import { SectionTitle, Panel } from '../ui/Card';
import { TapHandLoader } from '../ui/TapHandLoader';
import clsx from 'clsx';

export function PointsAnalyticsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'points-analytics'],
    queryFn: async () => {
      const { data: ledger, error } = await supabase
        .from('points_ledger')
        .select('points, status, created_at, activities(category)');
      if (error) throw error;

      const velocity = buildVelocitySummary(ledger ?? []);
      const axisBreakdown = buildAxisBreakdown(
        (ledger ?? []) as unknown as Array<{
          points: number;
          status: string;
          activities?: { category: string } | null;
        }>
      );

      return { velocity, axisBreakdown };
    },
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <Panel className="p-8">
        <TapHandLoader label="جاري تحميل التحليلات..." />
      </Panel>
    );
  }

  const { velocity, axisBreakdown } = data!;

  const TrendIcon =
    velocity.trend === 'up' ? TrendingUp : velocity.trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    velocity.trend === 'up'
      ? 'text-emerald-400'
      : velocity.trend === 'down'
        ? 'text-red-400'
        : 'text-white/40';

  return (
    <div className="space-y-4" dir="rtl">
      <SectionTitle icon={BarChart3}>تحليلات منح النقاط</SectionTitle>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-[#111c44] border border-white/5 p-4">
          <p className="text-white/40 text-xs mb-1">هذا الأسبوع</p>
          <p className="text-2xl font-bold text-gold-400 tabular-nums">{velocity.thisWeekTotal}</p>
          <p className="text-white/30 text-[10px] mt-0.5">نقطة معتمدة</p>
        </div>
        <div className="rounded-2xl bg-[#111c44] border border-white/5 p-4">
          <p className="text-white/40 text-xs mb-1">الأسبوع السابق</p>
          <p className="text-2xl font-bold text-white tabular-nums">{velocity.lastWeekTotal}</p>
          <p className="text-white/30 text-[10px] mt-0.5">نقطة معتمدة</p>
        </div>
        <div className="rounded-2xl bg-[#111c44] border border-white/5 p-4">
          <p className="text-white/40 text-xs mb-1">التغيّر</p>
          <p
            className={clsx(
              'text-2xl font-bold tabular-nums',
              velocity.changePct === null
                ? 'text-white/30'
                : velocity.changePct >= 0
                  ? 'text-emerald-400'
                  : 'text-red-400'
            )}
          >
            {velocity.changePct === null ? '—' : `${velocity.changePct > 0 ? '+' : ''}${velocity.changePct}%`}
          </p>
          <p className="text-white/30 text-[10px] mt-0.5">مقارنة أسبوعية</p>
        </div>
        <div className="rounded-2xl bg-[#111c44] border border-white/5 p-4">
          <p className="text-white/40 text-xs mb-1">الاتجاه</p>
          <div className="flex items-center gap-2">
            <TrendIcon className={clsx('w-6 h-6', trendColor)} />
            <p className={clsx('text-lg font-bold', trendColor)}>
              {velocity.trend === 'up' ? 'صاعد' : velocity.trend === 'down' ? 'هابط' : 'مستقر'}
            </p>
          </div>
          <p className="text-white/30 text-[10px] mt-0.5">
            متوسط يومي: {velocity.dailyAverage} نقطة
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel className="p-5">
          <h3 className="text-white font-semibold text-sm mb-4">مخطط السرعة — مقارنة أسبوعية</h3>
          <PointsVelocityLineChart
            thisWeek={velocity.thisWeek}
            lastWeek={velocity.lastWeek}
          />
        </Panel>

        <Panel className="p-5">
          <h3 className="text-white font-semibold text-sm mb-4">النقاط اليومية — هذا الأسبوع</h3>
          <DailyPointsBarChart
            data={velocity.thisWeek}
            compareData={velocity.lastWeek}
          />
        </Panel>
      </div>

      <Panel className="p-5">
        <h3 className="text-white font-semibold text-sm mb-4">توزيع النقاط المعتمدة حسب المحور</h3>
        <AxisBreakdownChart breakdown={axisBreakdown} />
      </Panel>
    </div>
  );
}
