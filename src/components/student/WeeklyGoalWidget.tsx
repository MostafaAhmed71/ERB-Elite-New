import { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import clsx from 'clsx';

const AXES = [
  { key: 'behavior', label: 'السلوك' },
  { key: 'activity', label: 'النشاط' },
  { key: 'achievement', label: 'الإنجاز' },
  { key: 'initiative', label: 'المبادرة' },
] as const;

const GOAL_TARGET = 15;
const STORAGE_KEY = 'student_weekly_goal';

type GoalState = { axis: string; weekKey: string };

function getWeekKey() {
  const d = new Date();
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return start.toISOString().slice(0, 10);
}

type Props = {
  breakdown: Record<string, number>;
  studentId: string;
};

export function WeeklyGoalWidget({ breakdown, studentId }: Props) {
  const weekKey = getWeekKey();
  const storageId = `${STORAGE_KEY}_${studentId}`;

  const [goal, setGoal] = useState<GoalState | null>(() => {
    try {
      const raw = localStorage.getItem(storageId);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GoalState;
      return parsed.weekKey === weekKey ? parsed : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (goal && goal.weekKey !== weekKey) setGoal(null);
  }, [weekKey, goal]);

  const saveGoal = (axis: string) => {
    const next = { axis, weekKey };
    setGoal(next);
    localStorage.setItem(storageId, JSON.stringify(next));
  };

  const currentAxis = goal?.axis ?? 'behavior';
  const currentValue = breakdown[currentAxis] ?? 0;
  const progress = Math.min(Math.round((currentValue / GOAL_TARGET) * 100), 100);

  return (
    <div className="glass-card p-5 space-y-3" dir="rtl">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <Target className="w-4 h-4 text-emerald-400" />
        هدفك الأسبوعي
      </h3>

      {!goal ? (
        <div className="space-y-2">
          <p className="text-white/50 text-xs">اختر محوراً للتركيز عليه هذا الأسبوع (+{GOAL_TARGET} نقطة):</p>
          <div className="flex flex-wrap gap-2">
            {AXES.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => saveGoal(a.key)}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/70 hover:border-gold-500/30 hover:text-gold-300 transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-white/60 text-xs">
            محور <strong className="text-white">{AXES.find((a) => a.key === currentAxis)?.label}</strong> — الهدف: {GOAL_TARGET} نقطة
          </p>
          <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all', progress >= 100 ? 'bg-emerald-500' : 'bg-gold-500')}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-white/40">{currentValue} / {GOAL_TARGET} نقطة في المحور</p>
          <button type="button" onClick={() => setGoal(null)} className="text-[10px] text-white/30 hover:text-white/50">
            تغيير الهدف
          </button>
        </div>
      )}
    </div>
  );
}
