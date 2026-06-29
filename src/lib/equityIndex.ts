export type ClassEquityRow = {
  key: string;
  grade: string;
  class_name: string;
  label: string;
  totalPoints: number;
  avgPerStudent: number;
  studentCount: number;
  deviationPct: number;
  alert: boolean;
};

type LedgerRow = {
  points: number;
  status: string;
  student_id: string;
  students: { grade: string; class_name: string } | null;
};

export function buildClassEquityIndex(ledger: LedgerRow[]): ClassEquityRow[] {
  const approved = ledger.filter((r) => r.status === 'approved' && r.students);
  const byClass = new Map<string, { points: number; students: Set<string>; grade: string; class_name: string }>();

  for (const row of approved) {
    const s = row.students!;
    const key = `${s.grade}__${s.class_name}`;
    if (!byClass.has(key)) {
      byClass.set(key, { points: 0, students: new Set(), grade: s.grade, class_name: s.class_name });
    }
    const c = byClass.get(key)!;
    c.points += row.points;
    c.students.add(row.student_id);
  }

  const rows: ClassEquityRow[] = Array.from(byClass.entries()).map(([key, c]) => ({
    key,
    grade: c.grade,
    class_name: c.class_name,
    label: `${c.grade} — ${c.class_name}`,
    totalPoints: c.points,
    studentCount: c.students.size,
    avgPerStudent: c.students.size > 0 ? Math.round(c.points / c.students.size) : 0,
    deviationPct: 0,
    alert: false,
  }));

  const overallAvg =
    rows.length > 0 ? rows.reduce((s, r) => s + r.avgPerStudent, 0) / rows.length : 0;

  return rows
    .map((r) => {
      const deviationPct =
        overallAvg > 0 ? Math.round(((r.avgPerStudent - overallAvg) / overallAvg) * 100) : 0;
      return {
        ...r,
        deviationPct,
        alert: overallAvg > 0 && r.avgPerStudent < overallAvg * 0.6,
      };
    })
    .sort((a, b) => a.avgPerStudent - b.avgPerStudent);
}
