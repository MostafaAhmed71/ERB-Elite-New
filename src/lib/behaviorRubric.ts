import type { DbActivity } from '../types';

export type RubricTier = 'excellent' | 'good' | 'needs_improvement';

export type RubricTierDef = {
  label: string;
  points: number;
};

export type BehaviorRubricCriterion = {
  id: string;
  label: string;
  tiers: Record<RubricTier, RubricTierDef>;
};

/** معايير Rubric السلوكي — T5 */
export const BEHAVIOR_RUBRIC: BehaviorRubricCriterion[] = [
  {
    id: 'uniform',
    label: 'الالتزام بالزي المدرسي',
    tiers: {
      excellent: { label: 'ممتاز', points: 15 },
      good: { label: 'جيد', points: 10 },
      needs_improvement: { label: 'يحتاج تحسين', points: 5 },
    },
  },
  {
    id: 'discipline',
    label: 'الهدوء والنظام في الفصل',
    tiers: {
      excellent: { label: 'ممتاز', points: 15 },
      good: { label: 'جيد', points: 10 },
      needs_improvement: { label: 'يحتاج تحسين', points: 5 },
    },
  },
  {
    id: 'respect',
    label: 'احترام المعلم والزملاء',
    tiers: {
      excellent: { label: 'ممتاز', points: 15 },
      good: { label: 'جيد', points: 10 },
      needs_improvement: { label: 'يحتاج تحسين', points: 5 },
    },
  },
  {
    id: 'responsibility',
    label: 'المسؤولية والالتزام',
    tiers: {
      excellent: { label: 'ممتاز', points: 15 },
      good: { label: 'جيد', points: 10 },
      needs_improvement: { label: 'يحتاج تحسين', points: 5 },
    },
  },
];

export type AppliedRubric = {
  activityId: string;
  points: number;
  note: string;
};

export function applyBehaviorRubric(
  criterionId: string,
  tier: RubricTier,
  activities: DbActivity[],
): AppliedRubric | null {
  const criterion = BEHAVIOR_RUBRIC.find((c) => c.id === criterionId);
  if (!criterion) return null;

  const tierDef = criterion.tiers[tier];
  const behaviorActivities = activities.filter((a) => a.category === 'behavior' && a.is_active);
  if (behaviorActivities.length === 0) return null;

  const activity =
    behaviorActivities.find((a) => a.default_points === tierDef.points) ?? behaviorActivities[0];

  return {
    activityId: activity.id,
    points: tierDef.points,
    note: `${criterion.label} — ${tierDef.label} (Rubric)`,
  };
}

export const RUBRIC_TIER_ORDER: RubricTier[] = ['excellent', 'good', 'needs_improvement'];

export const RUBRIC_TIER_STYLES: Record<RubricTier, string> = {
  excellent: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  good: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
  needs_improvement: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
};
