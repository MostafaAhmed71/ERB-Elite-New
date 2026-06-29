import type { PointAxisKey } from './pointsReference';

export type PointLedgerRow = {
  points: number;
  status: string;
  created_at: string;
  activities?: { category: string } | { category: string }[] | null;
};

export type AxisMonthComparison = {
  axis: PointAxisKey;
  label: string;
  currentMonth: number;
  previousMonth: number;
  delta: number;
  trend: 'up' | 'down' | 'flat';
};

const AXIS_LABELS: Record<PointAxisKey, string> = {
  activity: 'النشاط',
  behavior: 'السلوك',
  achievement: 'الإنجاز',
  initiative: 'المبادرة',
  attendance: 'الحضور',
};

const AXES: PointAxisKey[] = ['activity', 'behavior', 'achievement', 'initiative'];

function getAxisFromRow(row: PointLedgerRow): PointAxisKey | null {
  const act = row.activities;
  if (!act) return null;
  const category = Array.isArray(act) ? act[0]?.category : act.category;
  if (!category || !(category in AXIS_LABELS)) return null;
  return category as PointAxisKey;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function sumAxisInMonth(
  rows: PointLedgerRow[],
  axis: PointAxisKey,
  key: string,
): number {
  return rows
    .filter((r) => {
      if (r.status !== 'approved' || r.points <= 0) return false;
      const rowAxis = getAxisFromRow(r);
      if (rowAxis !== axis) return false;
      return monthKey(new Date(r.created_at)) === key;
    })
    .reduce((sum, r) => sum + r.points, 0);
}

/** مقارنة نقاط المحاور: الشهر الحالي مقابل السابق — PA4 */
export function computeAxisMonthComparison(
  rows: PointLedgerRow[],
  referenceDate = new Date(),
): AxisMonthComparison[] {
  const current = monthKey(referenceDate);
  const prevDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  const previous = monthKey(prevDate);

  return AXES.map((axis) => {
    const currentMonth = sumAxisInMonth(rows, axis, current);
    const previousMonth = sumAxisInMonth(rows, axis, previous);
    const delta = currentMonth - previousMonth;
    const trend: AxisMonthComparison['trend'] =
      delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

    return {
      axis,
      label: AXIS_LABELS[axis],
      currentMonth,
      previousMonth,
      delta,
      trend,
    };
  });
}

export function getProgressInsight(comparisons: AxisMonthComparison[]): string | null {
  const behavior = comparisons.find((c) => c.axis === 'behavior');
  if (!behavior) return null;

  if (behavior.delta > 0 && behavior.currentMonth > 0) {
    return `تحسّن في السلوك مقارنة بالشهر الماضي (+${behavior.delta} نقطة)`;
  }
  if (behavior.delta < 0) {
    return `انخفاض في نقاط السلوك هذا الشهر (${behavior.delta} نقطة) — قد يستحق متابعة`;
  }

  const bestGain = [...comparisons].sort((a, b) => b.delta - a.delta)[0];
  if (bestGain && bestGain.delta > 0) {
    return `تحسّن في محور ${bestGain.label} مقارنة بالشهر الماضي (+${bestGain.delta})`;
  }

  if (comparisons.every((c) => c.currentMonth === 0 && c.previousMonth === 0)) {
    return null;
  }

  return 'أداء مستقر هذا الشهر مقارنة بالشهر الماضي';
}
