import clsx from 'clsx';
import type { AxisBreakdown } from '../../lib/calculations';
import type { LevelInfo } from '../../lib/calculations';
import type { Achievement } from '../../lib/achievements';
import { AchievementBadges } from '../student/AchievementBadges';
import { Panel, SectionTitle } from '../ui/Card';
import { TrendingUp } from 'lucide-react';

type Props = {
  totalPoints: number;
  level: LevelInfo;
  breakdown: AxisBreakdown;
  achievements: Achievement[];
  progressPercent: number;
  pointsToNext: number;
  compact?: boolean;
};

const AXIS_LABELS: { key: keyof AxisBreakdown; label: string; color: string }[] = [
  { key: 'activity', label: 'النشاط', color: 'text-blue-400' },
  { key: 'behavior', label: 'السلوك', color: 'text-emerald-400' },
  { key: 'achievement', label: 'الإنجاز', color: 'text-purple-400' },
  { key: 'initiative', label: 'المبادرة', color: 'text-amber-400' },
  { key: 'attendance', label: 'الحضور', color: 'text-cyan-400' },
];

export function StudentMetricsOverview({
  totalPoints,
  level,
  breakdown,
  achievements,
  progressPercent,
  pointsToNext,
  compact = false,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel className="p-5">
          <span className="text-white/40 text-xs">إجمالي النقاط</span>
          <div className="flex items-baseline gap-2 mt-1">
            <h2 className="text-3xl font-black text-gold-400 font-mono tabular-nums">{totalPoints}</h2>
            <span className="text-white/40 text-xs">نقطة</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-white/50 text-xs">المستوى:</span>
            <span className={clsx('px-2 py-0.5 rounded-full border text-[10px] font-bold', level.badgeBg)}>
              {level.name}
            </span>
          </div>
          {!compact && level.nextMin && (
            <div className="mt-3 space-y-1">
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className={clsx('h-full rounded-full transition-all', level.progressBg)} style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="text-[10px] text-white/30">يتبقى {pointsToNext} نقطة للمستوى التالي</p>
            </div>
          )}
        </Panel>

        <Panel className="p-5">
          <SectionTitle icon={TrendingUp} className="mb-3 text-xs">
            المحاور الأربعة + الحضور
          </SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {AXIS_LABELS.map((axis) => (
              <div key={axis.key} className="p-2 rounded-lg bg-white/3 border border-white/5">
                <p className="text-[10px] text-white/40">{axis.label}</p>
                <p className={clsx('text-sm font-bold font-mono tabular-nums', axis.color)}>
                  {breakdown[axis.key]} ن
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="p-5">
        <AchievementBadges achievements={achievements} compact={compact} />
      </Panel>
    </div>
  );
}
