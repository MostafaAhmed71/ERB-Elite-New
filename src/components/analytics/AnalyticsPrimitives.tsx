import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export const AXIS_CHART_COLORS = {
  activity: '#4481EB',
  behavior: '#01B574',
  achievement: '#9F7AEA',
  initiative: '#f0b429',
  weighted: '#f0b429',
  bulk: '#04BEFE',
  exam: '#7551FF',
} as const;

export const CHART_TOOLTIP_STYLE = {
  background: '#111c44',
  border: '1px solid rgba(240,180,41,0.22)',
  borderRadius: 14,
  color: '#fff',
  fontSize: 12,
  boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
} as const;

export const CHART_GRID_STROKE = 'rgba(255,255,255,0.06)';
export const CHART_AXIS_TICK = { fill: 'rgba(255,255,255,0.55)', fontSize: 11 };

type KpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: 'gold' | 'blue' | 'emerald' | 'purple';
  delay?: number;
};

const KPI_ACCENTS = {
  gold: {
    ring: 'from-[#f0b429]/20 to-transparent',
    icon: 'bg-gradient-to-br from-[#f0b429] to-[#d4a017] text-[#111c44]',
  },
  blue: {
    ring: 'from-[#4481EB]/20 to-transparent',
    icon: 'bg-gradient-to-r from-[#4481EB] to-[#04BEFE] text-white',
  },
  emerald: {
    ring: 'from-[#01B574]/20 to-transparent',
    icon: 'bg-gradient-to-br from-[#01B574] to-[#048f5a] text-white',
  },
  purple: {
    ring: 'from-[#9F7AEA]/20 to-transparent',
    icon: 'bg-gradient-to-br from-[#7551FF] to-[#9F7AEA] text-white',
  },
};

export function KpiCard({ label, value, hint, icon: Icon, accent = 'gold', delay = 0 }: KpiCardProps) {
  const style = KPI_ACCENTS[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="relative overflow-hidden rounded-[18px] border border-white/[0.07] bg-[#111c44] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.22)]"
    >
      <div className={clsx('pointer-events-none absolute inset-0 bg-gradient-to-br', style.ring)} />
      <div className="relative flex items-start gap-3">
        <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-lg', style.icon)}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-[#A3AED0]">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-white tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-[10px] text-white/35">{hint}</p>}
        </div>
      </div>
    </motion.div>
  );
}

type AnalyticsPanelProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function AnalyticsPanel({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}: AnalyticsPanelProps) {
  return (
    <div
      className={clsx(
        'overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#111c44] shadow-[0_18px_40px_rgba(0,0,0,0.22)]',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            {Icon && <Icon className="h-4 w-4 text-gold-400" />}
            {title}
          </h3>
          {subtitle && <p className="mt-1 text-[11px] text-white/40">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className={clsx('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </div>
  );
}

export function AnalyticsLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-[11px] text-white/50">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function MiniProgressBar({
  value,
  max,
  color = AXIS_CHART_COLORS.weighted,
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export function RankPill({ rank }: { rank: number }) {
  const cls =
    rank === 1
      ? 'bg-gold-400/15 text-gold-300 border-gold-400/25'
      : rank === 2
        ? 'bg-slate-400/10 text-slate-200 border-slate-400/20'
        : rank === 3
          ? 'bg-amber-700/15 text-amber-400 border-amber-700/25'
          : 'bg-white/5 text-white/45 border-white/10';
  return (
    <span className={clsx('inline-flex h-7 min-w-7 items-center justify-center rounded-lg border px-1.5 text-xs font-bold tabular-nums', cls)}>
      {rank}
    </span>
  );
}
