import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import clsx from 'clsx';
import { GlassCard } from './GlassShell';

export type GlassSparkPoint = { v: number };

type GlassKpiCardProps = {
  label: string;
  value: string | number;
  trendPct?: number | null;
  trendLabel?: string;
  spark?: GlassSparkPoint[];
  accent?: 'purple' | 'cyan' | 'lime' | 'orange';
};

const ACCENT_STROKE = {
  purple: '#7551ff',
  cyan: '#4481eb',
  lime: '#01b574',
  orange: '#f0b429',
};

export function GlassKpiCard({
  label,
  value,
  trendPct = null,
  trendLabel,
  spark,
  accent = 'purple',
}: GlassKpiCardProps) {
  const up = trendPct != null && trendPct > 0;
  const down = trendPct != null && trendPct < 0;
  const TrendIcon = up ? TrendingUp : down ? TrendingDown : Minus;
  const stroke = ACCENT_STROKE[accent];
  const sparkData = spark?.length
    ? spark
    : [{ v: 2 }, { v: 4 }, { v: 3 }, { v: 6 }, { v: 5 }, { v: 8 }, { v: 7 }];
  const gid = `kpi-dk-${accent}-${label.replace(/\s/g, '')}`;

  return (
    <GlassCard padding="sm" className="min-h-[120px] flex flex-col justify-between gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-[#A3AED0] leading-snug font-cairo">{label}</p>
        {trendPct != null && (
          <span
            className={clsx(
              'inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums',
              up && 'glass-kpi-trend-up',
              down && 'glass-kpi-trend-down',
              !up && !down && 'glass-kpi-trend-flat',
            )}
          >
            <TrendIcon className="w-3.5 h-3.5" />
            {trendPct > 0 ? '+' : ''}
            {trendPct}%
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums tracking-tight truncate font-cairo">
            {value}
          </p>
          {trendLabel && (
            <p className="text-[10px] text-[#A3AED0] mt-1">{trendLabel}</p>
          )}
        </div>
        <div className="w-[80px] h-11 shrink-0 opacity-90">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={stroke}
                strokeWidth={2}
                fill={`url(#${gid})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </GlassCard>
  );
}
