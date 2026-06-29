import clsx from 'clsx';
import type { DbActivity } from '../../types';
import {
  BEHAVIOR_RUBRIC,
  RUBRIC_TIER_ORDER,
  RUBRIC_TIER_STYLES,
  applyBehaviorRubric,
  type RubricTier,
} from '../../lib/behaviorRubric';
import { ClipboardCheck } from 'lucide-react';

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
  const handleSelect = (criterionId: string, tier: RubricTier) => {
    const applied = applyBehaviorRubric(criterionId, tier, activities);
    if (!applied) return;
    onApply(applied.activityId, applied.points, applied.note);
  };

  return (
    <div className="glass-card p-4 border border-emerald-500/15" dir="rtl">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardCheck className="w-4 h-4 text-emerald-400" />
        <span className="text-white/80 text-sm font-medium">Rubric سلوكي — معايير واضحة</span>
        <span className="text-white/30 text-[10px]">ممتاز 15 · جيد 10 · يحتاج تحسين 5</span>
      </div>

      <div className="space-y-3">
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
    </div>
  );
}
