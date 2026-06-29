import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  computeAxisMonthComparison,
  getProgressInsight,
  type PointLedgerRow,
} from '../../lib/parentProgressComparison';

type Props = {
  points: PointLedgerRow[];
};

export function ParentProgressComparison({ points }: Props) {
  const comparisons = useMemo(() => computeAxisMonthComparison(points), [points]);
  const insight = useMemo(() => getProgressInsight(comparisons), [comparisons]);

  const chartData = comparisons.map((c) => ({
    name: c.label,
    'هذا الشهر': c.currentMonth,
    'الشهر الماضي': c.previousMonth,
  }));

  const hasData = comparisons.some((c) => c.currentMonth > 0 || c.previousMonth > 0);
  if (!hasData) return null;

  const now = new Date();
  const monthLabel = now.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

  return (
    <div className="glass-card p-5 space-y-4" dir="rtl">
      <div>
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          مقارنة التقدم — {monthLabel}
        </h3>
        {insight && (
          <p className="text-cyan-200/80 text-xs mt-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            {insight}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {comparisons.map((c) => (
          <div
            key={c.axis}
            className="p-3 rounded-xl bg-white/3 border border-white/5 text-center"
          >
            <p className="text-white/40 text-[10px]">{c.label}</p>
            <p className="text-white font-bold text-lg font-mono tabular-nums mt-1">
              {c.currentMonth}
            </p>
            <div
              className={clsx(
                'flex items-center justify-center gap-1 text-[10px] mt-1',
                c.trend === 'up' && 'text-emerald-400',
                c.trend === 'down' && 'text-red-400',
                c.trend === 'flat' && 'text-white/40',
              )}
            >
              {c.trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {c.trend === 'down' && <TrendingDown className="w-3 h-3" />}
              {c.trend === 'flat' && <Minus className="w-3 h-3" />}
              <span>
                {c.delta > 0 ? `+${c.delta}` : c.delta === 0 ? 'بدون تغيير' : c.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="h-44 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: '#0f1729',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="هذا الشهر" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            <Bar dataKey="الشهر الماضي" fill="rgba(255,255,255,0.25)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
