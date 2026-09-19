export interface PointEntry {
  id: string;
  points: number;
  status: 'pending' | 'pending_principal' | 'approved' | 'rejected';
  activity_id: string;
  activities?: {
    name: string;
    category: string;
  } | null;
}

export interface LevelInfo {
  name: string;
  min: number;
  nextMin: number | null;
  color: string;
  badgeBg: string;
  progressBg: string;
}

export const LEVELS: LevelInfo[] = [
  { name: 'مبتدئ', min: 0, nextMin: 200, color: 'text-slate-400', badgeBg: 'bg-slate-500/10 border-slate-500/20 text-slate-300', progressBg: 'bg-slate-500' },
  { name: 'برونزي', min: 200, nextMin: 400, color: 'text-amber-600', badgeBg: 'bg-amber-600/10 border-amber-600/20 text-amber-500', progressBg: 'bg-amber-600' },
  { name: 'فضي', min: 400, nextMin: 600, color: 'text-zinc-300', badgeBg: 'bg-zinc-300/10 border-zinc-300/20 text-zinc-300', progressBg: 'bg-zinc-300' },
  { name: 'ذهبي', min: 600, nextMin: 800, color: 'text-yellow-500', badgeBg: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500', progressBg: 'bg-yellow-500' },
  { name: 'بلاتيني', min: 800, nextMin: 1000, color: 'text-teal-400', badgeBg: 'bg-teal-400/10 border-teal-400/20 text-teal-400', progressBg: 'bg-teal-400' },
  { name: 'سفير النخبة', min: 1000, nextMin: null, color: 'text-gold-400 font-extrabold', badgeBg: 'bg-gold-500/15 border-gold-500/30 text-gold-400', progressBg: 'bg-gold-500' },
];

export function getLevelInfo(score: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (score >= LEVELS[i].min) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

export const DEFAULT_AXIS_WEIGHTS = {
  activity: 0.35,
  behavior: 0.25,
  achievement: 0.15,
  initiative: 0.1,
  attendance: 0.15,
} as const;

export type AxisWeights = {
  activity: number;
  behavior: number;
  achievement: number;
  initiative: number;
  attendance: number;
};

export function computeWeightedScore(
  breakdown: {
    activity: number;
    behavior: number;
    achievement: number;
    initiative: number;
    attendance: number;
  },
  weights: AxisWeights = DEFAULT_AXIS_WEIGHTS
): number {
  return Math.round(
    breakdown.activity * weights.activity +
    breakdown.behavior * weights.behavior +
    breakdown.achievement * weights.achievement +
    breakdown.initiative * weights.initiative +
    breakdown.attendance * weights.attendance
  );
}

/** محور النقاط من تصنيف النشاط */
export function getCategoryAxisKey(category: string): keyof AxisWeights {
  if (
    category === 'behavior' ||
    category === 'achievement' ||
    category === 'initiative' ||
    category === 'attendance'
  ) {
    return category;
  }
  return 'activity';
}

/** تقدير مساهمة منح واحد في الرصيد الموزون (لوحة المتصدرين) */
export function estimateWeightedPointsFromGrant(
  rawPoints: number,
  category: string,
  weights: AxisWeights = DEFAULT_AXIS_WEIGHTS
): number {
  const axis = getCategoryAxisKey(category);
  if (axis === 'attendance') return 0;
  return Math.round(Math.abs(rawPoints) * weights[axis]);
}

/** مجموع النقاط المعتمدة الخام (بدون أوزان) */
export function sumRawApprovedPoints(entries: PointEntry[]): number {
  return entries.filter((e) => e.status === 'approved').reduce((sum, e) => sum + e.points, 0);
}

/** مجموع النقاط المعتمدة — ما يراه الطالب/ولي الأمر كرصيده */
export function getApprovedPointsTotal(entries: PointEntry[]): number {
  return sumRawApprovedPoints(entries);
}

export type AxisBreakdown = {
  activity: number;
  behavior: number;
  achievement: number;
  initiative: number;
  attendance: number;
};

/** تفصيل النقاط الخام المعتمدة حسب محور النشاط (بدون أوزان) */
export function getRawAxisBreakdown(entries: PointEntry[]): AxisBreakdown {
  const approved = entries.filter((e) => e.status === 'approved');
  const breakdown: AxisBreakdown = {
    activity: 0,
    behavior: 0,
    achievement: 0,
    initiative: 0,
    attendance: 0,
  };

  approved.forEach((entry) => {
    const category = entry.activities?.category || 'activity';
    const axis = getCategoryAxisKey(category);
    breakdown[axis] += entry.points;
  });

  return breakdown;
}

export function getFinalScore(
  entries: PointEntry[],
  weights: AxisWeights = DEFAULT_AXIS_WEIGHTS,
  attendanceScore = 0
): number {
  const approved = entries.filter(e => e.status === 'approved');

  // Sum points by category
  let activitySum = 0;
  let behaviorSum = 0;
  let achievementSum = 0;
  let initiativeSum = 0;

  // For the activity category, we group by activity_id to apply the 100-point cap
  const activityGroups: Record<string, number> = {};

  approved.forEach(entry => {
    const category = entry.activities?.category || 'activity';
    const points = entry.points;

    if (category === 'activity') {
      const actId = entry.activity_id || 'general';
      activityGroups[actId] = (activityGroups[actId] || 0) + points;
    } else if (category === 'behavior') {
      behaviorSum += points;
    } else if (category === 'achievement') {
      achievementSum += points;
    } else if (category === 'initiative') {
      initiativeSum += points;
    }
  });

  // Apply 100-point cap per sub-activity for the activity category
  Object.values(activityGroups).forEach(totalPoints => {
    activitySum += Math.min(totalPoints, 100);
  });

  // Calculate weighted score
  return computeWeightedScore(
    {
      activity: activitySum,
      behavior: behaviorSum,
      achievement: achievementSum,
      initiative: initiativeSum,
      attendance: attendanceScore,
    },
    weights
  );
}

export interface CategoryBreakdown {
  activity: number;
  behavior: number;
  achievement: number;
  initiative: number;
  attendance: number;
  weighted: number;
}

export function getCategoryBreakdown(
  entries: PointEntry[],
  weights: AxisWeights = DEFAULT_AXIS_WEIGHTS,
  attendanceScore = 0
): CategoryBreakdown {
  const approved = entries.filter(e => e.status === 'approved');
  const activityGroups: Record<string, number> = {};
  let behaviorSum = 0;
  let achievementSum = 0;
  let initiativeSum = 0;

  approved.forEach(entry => {
    const category = entry.activities?.category || 'activity';
    if (category === 'activity') {
      const actId = entry.activity_id || 'general';
      activityGroups[actId] = (activityGroups[actId] || 0) + entry.points;
    } else if (category === 'behavior') {
      behaviorSum += entry.points;
    } else if (category === 'achievement') {
      achievementSum += entry.points;
    } else if (category === 'initiative') {
      initiativeSum += entry.points;
    }
  });

  const activitySum = Object.values(activityGroups).reduce(
    (sum, total) => sum + Math.min(total, 100),
    0
  );

  return {
    activity: activitySum,
    behavior: behaviorSum,
    achievement: achievementSum,
    initiative: initiativeSum,
    attendance: attendanceScore,
    weighted: computeWeightedScore(
      {
        activity: activitySum,
        behavior: behaviorSum,
        achievement: achievementSum,
        initiative: initiativeSum,
        attendance: attendanceScore,
      },
      weights
    ),
  };
}
