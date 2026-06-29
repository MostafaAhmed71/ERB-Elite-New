import { getCategoryBreakdown, getFinalScore, getLevelInfo, computeWeightedScore, type PointEntry } from './calculations';
import { getLevelInfoFromConfig, type AxisWeights, type ExcellenceLevel } from './schoolConfig';
import { buildClassAxisReport, averagePerStudent } from './classReport';

export type PrincipalKpis = {
  totalStudents: number;
  pointsThisMonth: number;
  pointsLastMonth: number;
  pointsDeltaPct: number | null;
  axisAverages: { activity: number; behavior: number; achievement: number; initiative: number };
  goldPlusPct: number;
  avgApprovalHours: number | null;
  examPassRate: number | null;
  rejectedThisWeek: number;
  pendingPoints: number;
  warningCount: number;
};

type LedgerRow = {
  student_id: string;
  points: number;
  status: string;
  activity_id: string | null;
  created_at: string;
  approved_at: string | null;
  activities: { category: string } | null;
  students: { grade: string; class_name: string } | null;
};

type ExamResultRow = {
  score: number;
  max_score: number;
};

function monthRange(offsetMonths: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offsetMonths + 1, 0, 23, 59, 59);
  return { start, end };
}

export function buildPrincipalKpis(
  studentCount: number,
  ledger: LedgerRow[],
  examResults: ExamResultRow[],
  warningCount: number,
  weights?: AxisWeights,
  levels?: ExcellenceLevel[]
): PrincipalKpis {
  const approved = ledger.filter((r) => r.status === 'approved');
  const thisMonth = monthRange(0);
  const lastMonth = monthRange(1);

  const sumInRange = (start: Date, end: Date) =>
    approved
      .filter((r) => {
        const d = new Date(r.created_at);
        return d >= start && d <= end;
      })
      .reduce((s, r) => s + r.points, 0);

  const pointsThisMonth = sumInRange(thisMonth.start, thisMonth.end);
  const pointsLastMonth = sumInRange(lastMonth.start, lastMonth.end);
  const pointsDeltaPct =
    pointsLastMonth > 0
      ? Math.round(((pointsThisMonth - pointsLastMonth) / pointsLastMonth) * 100)
      : null;

  const byStudent = new Map<string, PointEntry[]>();
  for (const row of approved) {
    if (!byStudent.has(row.student_id)) byStudent.set(row.student_id, []);
    byStudent.get(row.student_id)!.push({
      id: row.student_id,
      points: row.points,
      status: 'approved',
      activity_id: row.activity_id ?? '',
      activities: row.activities ? { name: '', category: row.activities.category } : null,
    });
  }

  let activity = 0;
  let behavior = 0;
  let achievement = 0;
  let initiative = 0;
  let goldPlus = 0;

  for (const [, entries] of byStudent) {
    const b = getCategoryBreakdown(entries);
    activity += b.activity;
    behavior += b.behavior;
    achievement += b.achievement;
    initiative += b.initiative;
    const score = weights ? computeWeightedScore(b, weights) : getFinalScore(entries);
    const level = levels ? getLevelInfoFromConfig(score, levels) : getLevelInfo(score);
    const goldIndex = levels
      ? levels.findIndex((l) => l.name === 'ذهبي')
      : 3;
    const levelIndex = levels
      ? levels.findIndex((l) => l.name === level.name)
      : 3;
    if (levelIndex >= goldIndex && goldIndex >= 0) goldPlus += 1;
  }

  const n = byStudent.size || 1;
  const axisAverages = {
    activity: Math.round(activity / n),
    behavior: Math.round(behavior / n),
    achievement: Math.round(achievement / n),
    initiative: Math.round(initiative / n),
  };

  const approvalDeltas = ledger
    .filter((r) => r.status === 'approved' && r.approved_at)
    .map((r) => (new Date(r.approved_at!).getTime() - new Date(r.created_at).getTime()) / 3600000);
  const avgApprovalHours =
    approvalDeltas.length > 0
      ? Math.round((approvalDeltas.reduce((a, b) => a + b, 0) / approvalDeltas.length) * 10) / 10
      : null;

  const passCount = examResults.filter((r) => r.max_score > 0 && r.score / r.max_score >= 0.6).length;
  const examPassRate =
    examResults.length > 0 ? Math.round((passCount / examResults.length) * 100) : null;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rejectedThisWeek = ledger.filter(
    (r) => r.status === 'rejected' && new Date(r.created_at) >= weekAgo
  ).length;
  const pendingPoints = ledger.filter((r) => r.status === 'pending').length;

  return {
    totalStudents: studentCount,
    pointsThisMonth,
    pointsLastMonth,
    pointsDeltaPct,
    axisAverages,
    goldPlusPct: studentCount > 0 ? Math.round((goldPlus / studentCount) * 100) : 0,
    avgApprovalHours,
    examPassRate,
    rejectedThisWeek,
    pendingPoints,
    warningCount,
  };
}

export function buildMonthlyClassComparison(ledger: LedgerRow[]) {
  const rows = buildClassAxisReport(ledger as Parameters<typeof buildClassAxisReport>[0]);
  return rows.map((r) => ({
    name: r.label,
    grade: r.grade,
    class_name: r.class_name,
    نشاط: averagePerStudent(r, 'activity'),
    سلوك: averagePerStudent(r, 'behavior'),
    إنجاز: averagePerStudent(r, 'achievement'),
    مبادرة: averagePerStudent(r, 'initiative'),
    موزون: averagePerStudent(r, 'weighted'),
    طلاب: r.studentCount,
  }));
}

export function simulateWeightChange(
  ledger: LedgerRow[],
  newWeights: AxisWeights
) {
  const rows = buildClassAxisReport(ledger as Parameters<typeof buildClassAxisReport>[0]);
  return rows
    .map((r) => {
      const current = averagePerStudent(r, 'weighted');
      const simulated = computeWeightedScore(
        {
          activity: averagePerStudent(r, 'activity'),
          behavior: averagePerStudent(r, 'behavior'),
          achievement: averagePerStudent(r, 'achievement'),
          initiative: averagePerStudent(r, 'initiative'),
          attendance: 0,
        },
        newWeights
      );
      return {
        class: r.label,
        current,
        simulated,
        delta: simulated - current,
      };
    })
    .sort((a, b) => b.simulated - a.simulated);
}
