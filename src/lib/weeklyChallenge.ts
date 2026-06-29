import { buildClassAxisReport, averagePerStudent, type ClassAxisRow, type ClassGrantLedgerRow } from './classReport';

export type WeeklyChallengeAxis = 'initiative' | 'activity';

export type WeeklyChallengeResult = {
  weekLabel: string;
  axis: WeeklyChallengeAxis;
  axisLabel: string;
  winner: ClassAxisRow | null;
  rankings: { label: string; score: number; rank: number }[];
};

type LedgerRow = {
  student_id: string;
  points: number;
  status: string;
  activity_id: string | null;
  created_at: string;
  activities: { category: string } | null;
  students: { grade: string; class_name: string } | null;
};

const AXIS_LABELS: Record<WeeklyChallengeAxis, string> = {
  initiative: 'المبادرة',
  activity: 'النشاط',
};

export function buildWeeklyChallenge(
  ledger: LedgerRow[],
  axis: WeeklyChallengeAxis = 'initiative',
  classGrants: ClassGrantLedgerRow[] = []
): WeeklyChallengeResult {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recent = ledger.filter(
    (r) => r.status === 'approved' && new Date(r.created_at) >= weekAgo
  );
  const recentClassGrants = classGrants.filter(
    (g) => g.status === 'approved' && g.created_at && new Date(g.created_at) >= weekAgo
  );

  const rows = buildClassAxisReport(
    recent as Parameters<typeof buildClassAxisReport>[0],
    recentClassGrants
  );
  const rankings = rows
    .map((r) => ({
      label: r.label,
      score: averagePerStudent(r, axis),
      row: r,
    }))
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ label: r.label, score: r.score, rank: i + 1, row: r.row }));

  const winner = rankings[0]?.row ?? null;

  return {
    weekLabel: `أسبوع ${new Date().toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}`,
    axis,
    axisLabel: AXIS_LABELS[axis],
    winner,
    rankings: rankings.map(({ label, score, rank }) => ({ label, score, rank })),
  };
}
