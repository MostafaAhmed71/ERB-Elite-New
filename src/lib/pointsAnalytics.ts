import { sum, mean, linearRegression, linearRegressionLine } from 'simple-statistics';

export type LedgerPointRow = {
  points: number;
  status: string;
  created_at: string;
};

export type DailyPoint = {
  date: string;
  label: string;
  points: number;
  count: number;
};

export type VelocitySummary = {
  thisWeek: DailyPoint[];
  lastWeek: DailyPoint[];
  thisWeekTotal: number;
  lastWeekTotal: number;
  changePct: number | null;
  dailyAverage: number;
  trend: 'up' | 'down' | 'flat';
  trendSlope: number;
};

const DAY_NAMES = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDayLabel(d: Date): string {
  return DAY_NAMES[d.getDay()];
}

/** آخر 7 أيام بما فيها اليوم */
export function buildDailySeries(
  rows: LedgerPointRow[],
  days = 7,
  now = new Date()
): DailyPoint[] {
  const approved = rows.filter((r) => r.status === 'approved');
  const buckets = new Map<string, { points: number; count: number }>();

  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(new Date(now));
    d.setDate(d.getDate() - i);
    buckets.set(formatDateKey(d), { points: 0, count: 0 });
  }

  for (const row of approved) {
    const key = formatDateKey(new Date(row.created_at));
    if (!buckets.has(key)) continue;
    const b = buckets.get(key)!;
    b.points += row.points;
    b.count += 1;
  }

  return [...buckets.entries()].map(([date, { points, count }]) => ({
    date,
    label: formatDayLabel(new Date(date)),
    points,
    count,
  }));
}

export function buildVelocitySummary(
  rows: LedgerPointRow[],
  now = new Date()
): VelocitySummary {
  const thisWeek = buildDailySeries(rows, 7, now);

  const lastWeekEnd = startOfDay(new Date(now));
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
  const lastWeek = buildDailySeries(rows, 7, lastWeekEnd);

  const thisWeekTotal = sum(thisWeek.map((d) => d.points));
  const lastWeekTotal = sum(lastWeek.map((d) => d.points));

  const changePct =
    lastWeekTotal > 0
      ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
      : thisWeekTotal > 0
        ? 100
        : null;

  const dailyAverage = Math.round(mean(thisWeek.map((d) => d.points)) * 10) / 10;

  const pairs: [number, number][] = thisWeek.map((d, i) => [i, d.points]);
  const regression = linearRegression(pairs);
  const slope = regression.m;

  const trend: VelocitySummary['trend'] =
    slope > 0.5 ? 'up' : slope < -0.5 ? 'down' : 'flat';

  return {
    thisWeek,
    lastWeek,
    thisWeekTotal,
    lastWeekTotal,
    changePct,
    dailyAverage,
    trend,
    trendSlope: Math.round(slope * 10) / 10,
  };
}

export type PendingInsight = {
  pendingCount: number;
  oldestDays: number | null;
  highestPoints: number;
  highestTeacher: string | null;
  todayApproved: number;
  todayGranted: number;
};

export type PendingRow = {
  points: number;
  status: string;
  created_at: string;
  granted_by_user?: { full_name: string } | null;
};

export function buildPendingInsights(
  rows: PendingRow[],
  now = new Date()
): PendingInsight {
  const pending = rows.filter((r) => r.status === 'pending');
  const todayKey = formatDateKey(now);

  let oldestDays: number | null = null;
  let highestPoints = 0;
  let highestTeacher: string | null = null;

  for (const row of pending) {
    const created = new Date(row.created_at);
    const days = Math.floor(
      (startOfDay(now).getTime() - startOfDay(created).getTime()) / 86_400_000
    );
    if (oldestDays === null || days > oldestDays) oldestDays = days;

    if (row.points > highestPoints) {
      highestPoints = row.points;
      highestTeacher = row.granted_by_user?.full_name ?? null;
    }
  }

  const todayApproved = rows.filter(
    (r) =>
      r.status === 'approved' &&
      formatDateKey(new Date(r.created_at)) === todayKey
  ).length;

  const todayGranted = rows.filter(
    (r) => formatDateKey(new Date(r.created_at)) === todayKey
  ).length;

  return {
    pendingCount: pending.length,
    oldestDays,
    highestPoints,
    highestTeacher,
    todayApproved,
    todayGranted,
  };
}

/** نقاط معتمدة حسب المحور */
export type AxisBreakdown = {
  activity: number;
  behavior: number;
  achievement: number;
  initiative: number;
};

export function buildAxisBreakdown(
  rows: Array<{ points: number; status: string; activities?: { category: string } | null }>
): AxisBreakdown {
  const result: AxisBreakdown = {
    activity: 0,
    behavior: 0,
    achievement: 0,
    initiative: 0,
  };

  for (const row of rows) {
    if (row.status !== 'approved') continue;
    const cat = row.activities?.category ?? 'activity';
    if (cat in result) result[cat as keyof AxisBreakdown] += row.points;
  }

  return result;
}

export { linearRegressionLine };
