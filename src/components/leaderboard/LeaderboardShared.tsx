import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Trophy } from 'lucide-react';
import type { LeaderboardPeriod } from './types';

export function RelativeProgressBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={clsx('h-1.5 w-full rounded-full bg-white/5 overflow-hidden', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="h-full rounded-full bg-gradient-to-l from-gold-400 to-gold-500/80"
      />
    </div>
  );
}

export function LeaderboardEmptyState({
  variant,
}: {
  variant: 'students' | 'classes';
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gold-400/10 border border-gold-400/25 flex items-center justify-center">
        <Trophy className="w-7 h-7 text-gold-400/80" />
      </div>
      <div className="space-y-1.5">
        <p className="text-white font-bold text-base">لم يصل أحد إلى القمة حتى الآن</p>
        <p className="text-white/45 text-sm leading-relaxed max-w-xs">
          {variant === 'classes'
            ? 'أول منحة جماعية تفتح سباق الفصول'
            : 'أول نقطة تُمنح تفتح السباق'}
        </p>
      </div>
    </div>
  );
}

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'weekly', label: 'أسبوعي' },
  { id: 'monthly', label: 'شهري' },
  { id: 'semester', label: 'فصلي' },
];

export function LeaderboardPeriodTabs({
  value,
  onChange,
}: {
  value: LeaderboardPeriod;
  onChange: (p: LeaderboardPeriod) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-0.5 gap-0.5"
      role="tablist"
      aria-label="النطاق الزمني"
    >
      {PERIODS.map((p) => (
        <button
          key={p.id}
          type="button"
          role="tab"
          aria-selected={value === p.id}
          onClick={() => onChange(p.id)}
          className={clsx(
            'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors',
            value === p.id
              ? 'bg-gold-400/20 text-gold-300 border border-gold-400/30'
              : 'text-white/40 hover:text-white/70 border border-transparent',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/**
 * حساب تاريخ البداية للفترة الزمنية المحددة للوحة المتصدرين
 */
export function getPeriodStartDate(period: LeaderboardPeriod): string {
  const now = Date.now();
  if (period === 'weekly') {
    return new Date(now - 7 * 86_400_000).toISOString();
  }
  if (period === 'monthly') {
    return new Date(now - 30 * 86_400_000).toISOString();
  }
  // semester: ~120 days (فصل دراسي)
  return new Date(now - 120 * 86_400_000).toISOString();
}
