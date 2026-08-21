import { useState } from 'react';
import clsx from 'clsx';
import type { DbActivity } from '../../types';
import {
  BEHAVIOR_RUBRIC,
  RUBRIC_TIER_ORDER,
  RUBRIC_TIER_STYLES,
  applyBehaviorRubric,
  type RubricTier,
} from '../../lib/behaviorRubric';
import { ClipboardCheck, ChevronDown } from 'lucide-react';

type Props = {
  activities: DbActivity[];
  onApply: (activityId: string, points: number, note: string) => void;
  activeCriterionId?: string | null;
  activeTier?: RubricTier | null;
};

export function BehavioralRubricPanel({
  activities,
  onApply,
  activeCriterionId,
  activeTier,
}: Props) {
  const [open, setOpen] = useState(false);

  const handleSelect = (criterionId: string, tier: RubricTier) => {
    const applied = applyBehaviorRubric(criterionId, tier, activities);
    if (!applied) return;
    onApply(applied.activityId, applied.points, applied.note);
  };

  return (
    <div className="glass-card overflow-hidden border border-emerald-500/15" dir="rtl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-4 text-right hover:bg-white/[0.03] transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0 flex-wrap">
          <ClipboardCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-white/80 text-sm font-medium">Rubric سلوكي — معايير واضحة</span>
          <span className="text-white/30 text-[10px]">ممتاز 15 · جيد 10 · يحتاج تحسين 5</span>
        </span>
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-white/40 transition-transform shrink-0',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {BEHAVIOR_RUBRIC.map((criterion) => (
            <div key={criterion.id} className="space-y-2">
              <p className="text-white/60 text-xs font-medium">{criterion.label}</p>
              <div className="flex flex-wrap gap-2">
                {RUBRIC_TIER_ORDER.map((tier) => {
                  const tierDef = criterion.tiers[tier];
                  const isActive = activeCriterionId === criterion.id && activeTier === tier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => handleSelect(criterion.id, tier)}
                      className={clsx(
                        'px-3 py-2 rounded-xl border text-xs transition-all',
                        isActive
                          ? RUBRIC_TIER_STYLES[tier] + ' ring-1 ring-white/20'
                          : RUBRIC_TIER_STYLES[tier] + ' opacity-80 hover:opacity-100',
                      )}
                    >
                      <span className="font-semibold">{tierDef.label}</span>
                      <span className="mx-1.5 text-white/30">·</span>
                      <span className="font-mono">+{tierDef.points}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
