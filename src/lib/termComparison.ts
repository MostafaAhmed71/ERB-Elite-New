import { buildClassAxisReport, averagePerStudent, type ClassAxisRow, type ClassGrantLedgerRow } from './classReport';

type LedgerRow = {
  student_id: string;
  points: number;
  status: string;
  activity_id: string | null;
  created_at?: string;
  activities: { category: string } | null;
  students: { grade: string; class_name: string; full_name: string } | null;
};

export type ClassTermDelta = {
  key: string;
  grade: string;
  class_name: string;
  label: string;
  term1Weighted: number;
  term2Weighted: number;
  delta: number;
  trend: 'up' | 'down' | 'flat';
  term1Activity: number;
  term2Activity: number;
  term1Behavior: number;
  term2Behavior: number;
};

function filterLedgerByRange(
  ledger: LedgerRow[],
  from: Date,
  to: Date,
): LedgerRow[] {
  return ledger.filter((row) => {
    if (!row.created_at) return true;
    const d = new Date(row.created_at);
    return d >= from && d <= to;
  });
}

function filterGrantsByRange(
  grants: ClassGrantLedgerRow[],
  from: Date,
  to: Date,
): ClassGrantLedgerRow[] {
  return grants.filter((g) => {
    if (!g.created_at) return true;
    const d = new Date(g.created_at);
    return d >= from && d <= to;
  });
}

export function buildTermClassComparison(
  ledger: LedgerRow[],
  classGrants: ClassGrantLedgerRow[],
  term1From: Date,
  term1To: Date,
  term2From: Date,
  term2To: Date,
): ClassTermDelta[] {
  const term1Rows = buildClassAxisReport(
    filterLedgerByRange(ledger, term1From, term1To),
    filterGrantsByRange(classGrants, term1From, term1To),
  );
  const term2Rows = buildClassAxisReport(
    filterLedgerByRange(ledger, term2From, term2To),
    filterGrantsByRange(classGrants, term2From, term2To),
  );

  const t1Map = new Map(term1Rows.map((r) => [r.key, r]));
  const t2Map = new Map(term2Rows.map((r) => [r.key, r]));
  const allKeys = new Set([...t1Map.keys(), ...t2Map.keys()]);

  return [...allKeys]
    .map((key) => {
      const t1 = t1Map.get(key);
      const t2 = t2Map.get(key);
      const grade = t1?.grade ?? t2!.grade;
      const class_name = t1?.class_name ?? t2!.class_name;
      const term1Weighted = t1 ? averagePerStudent(t1, 'weighted') : 0;
      const term2Weighted = t2 ? averagePerStudent(t2, 'weighted') : 0;
      const delta = term2Weighted - term1Weighted;
      const trend: ClassTermDelta['trend'] =
        delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

      return {
        key,
        grade,
        class_name,
        label: `${grade} — ${class_name}`,
        term1Weighted,
        term2Weighted,
        delta,
        trend,
        term1Activity: t1 ? averagePerStudent(t1, 'activity') : 0,
        term2Activity: t2 ? averagePerStudent(t2, 'activity') : 0,
        term1Behavior: t1 ? averagePerStudent(t1, 'behavior') : 0,
        term2Behavior: t2 ? averagePerStudent(t2, 'behavior') : 0,
      };
    })
    .sort((a, b) => b.term2Weighted - a.term2Weighted);
}

export function summarizeTermComparison(rows: ClassTermDelta[]): {
  improved: number;
  declined: number;
  stable: number;
  topGainer: ClassTermDelta | null;
} {
  const improved = rows.filter((r) => r.trend === 'up').length;
  const declined = rows.filter((r) => r.trend === 'down').length;
  const stable = rows.filter((r) => r.trend === 'flat').length;
  const topGainer = [...rows].sort((a, b) => b.delta - a.delta)[0] ?? null;
  return { improved, declined, stable, topGainer };
}
