/** ST5 — سلسلة إنجاز: أيام متتالية بحضور أو نشاط معتمد */

export type EngagementStreak = {
  current: number;
  longest: number;
  activeToday: boolean;
  lastActiveDate: string | null;
};

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function uniqueSortedDates(keys: string[]): string[] {
  return [...new Set(keys)].sort();
}

/** يحسب أطول سلسلة وأيام متتالية حتى اليوم (أو أمس إن لم يكن نشطاً اليوم) */
export function computeEngagementStreak(
  attendanceDates: string[],
  activityDates: string[],
  now = new Date(),
): EngagementStreak {
  const today = dateKey(now);
  const activeDays = uniqueSortedDates([
    ...attendanceDates.filter(Boolean),
    ...activityDates.filter(Boolean),
  ]);

  if (activeDays.length === 0) {
    return { current: 0, longest: 0, activeToday: false, lastActiveDate: null };
  }

  const activeSet = new Set(activeDays);
  const activeToday = activeSet.has(today);

  let longest = 0;
  let run = 0;
  let prev: string | null = null;

  for (const day of activeDays) {
    if (!prev) {
      run = 1;
    } else {
      const prevD = new Date(prev + 'T12:00:00');
      const curD = new Date(day + 'T12:00:00');
      const diffDays = Math.round((curD.getTime() - prevD.getTime()) / 86_400_000);
      run = diffDays === 1 ? run + 1 : 1;
    }
    longest = Math.max(longest, run);
    prev = day;
  }

  let current = 0;
  const cursor = new Date(now);
  if (!activeToday) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (activeSet.has(dateKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    current,
    longest,
    activeToday,
    lastActiveDate: activeDays[activeDays.length - 1] ?? null,
  };
}

export const STREAK_MILESTONES = [
  { days: 3, label: 'بداية قوية', emoji: '🔥' },
  { days: 7, label: 'أسبوع متواصل', emoji: '⭐' },
  { days: 14, label: 'أسبوعان من الالتزام', emoji: '🏅' },
  { days: 30, label: 'شهر من التميز', emoji: '👑' },
] as const;

export function getStreakMilestone(current: number) {
  let best: (typeof STREAK_MILESTONES)[number] | null = null;
  for (const m of STREAK_MILESTONES) {
    if (current >= m.days) best = m;
  }
  return best;
}
