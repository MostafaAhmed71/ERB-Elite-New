import { supabase } from './supabase';
import { AXES_KEYS } from './pointsReference';

export type ClassActivityLedgerRow = {
  student_id: string;
  points: number;
  activities: { category: string; name: string } | null;
  students: { grade: string; class_name: string } | null;
};

export type ClassActivityAnalysisRow = {
  classKey: string;
  label: string;
  grade: string;
  class_name: string;
  studentCount: number;
  activeStudents: number;
  participationPct: number;
  totalGrants: number;
  topCategory: string;
  topCategoryPoints: number;
  topActivity: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  activity: AXES_KEYS.activity,
  behavior: AXES_KEYS.behavior,
  achievement: AXES_KEYS.achievement,
  initiative: AXES_KEYS.initiative,
  attendance: AXES_KEYS.attendance,
};

function classKey(grade: string, class_name: string) {
  return `${grade}::${class_name}`;
}

/** AL9 — تحليل مشاركة الفصول في الأنشطة */
export function buildClassActivityAnalysis(
  ledger: ClassActivityLedgerRow[],
  studentCounts: Map<string, number>,
  days = 30,
  now = new Date(),
): ClassActivityAnalysisRow[] {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  const byClass = new Map<
    string,
    {
      grade: string;
      class_name: string;
      students: Set<string>;
      grants: number;
      categories: Map<string, number>;
      activities: Map<string, number>;
    }
  >();

  for (const row of ledger) {
    const st = row.students;
    if (!st) continue;
    const key = classKey(st.grade, st.class_name);
    if (!byClass.has(key)) {
      byClass.set(key, {
        grade: st.grade,
        class_name: st.class_name,
        students: new Set(),
        grants: 0,
        categories: new Map(),
        activities: new Map(),
      });
    }
    const bucket = byClass.get(key)!;
    bucket.students.add(row.student_id);
    bucket.grants++;

    const cat = row.activities?.category ?? 'activity';
    bucket.categories.set(cat, (bucket.categories.get(cat) ?? 0) + row.points);

    const actName = row.activities?.name ?? 'نشاط';
    bucket.activities.set(actName, (bucket.activities.get(actName) ?? 0) + 1);
  }

  const rows: ClassActivityAnalysisRow[] = [];

  for (const [key, bucket] of byClass) {
    const studentCount = studentCounts.get(key) ?? bucket.students.size;
    const activeStudents = bucket.students.size;
    const participationPct =
      studentCount > 0 ? Math.round((activeStudents / studentCount) * 100) : 0;

    let topCategory = 'activity';
    let topCategoryPoints = 0;
    for (const [cat, pts] of bucket.categories) {
      if (pts > topCategoryPoints) {
        topCategory = cat;
        topCategoryPoints = pts;
      }
    }

    let topActivity = '—';
    let topActivityCount = 0;
    for (const [name, count] of bucket.activities) {
      if (count > topActivityCount) {
        topActivity = name;
        topActivityCount = count;
      }
    }

    rows.push({
      classKey: key,
      label: `${bucket.grade} — ${bucket.class_name}`,
      grade: bucket.grade,
      class_name: bucket.class_name,
      studentCount,
      activeStudents,
      participationPct,
      totalGrants: bucket.grants,
      topCategory: CATEGORY_LABELS[topCategory] ?? topCategory,
      topCategoryPoints,
      topActivity,
    });
  }

  return rows.sort((a, b) => b.participationPct - a.participationPct || b.totalGrants - a.totalGrants);
}

export async function fetchClassActivityAnalysis(days = 30): Promise<ClassActivityAnalysisRow[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const [ledgerRes, studentsRes] = await Promise.all([
    supabase
      .from('points_ledger')
      .select(`
        student_id, points, created_at,
        activities (category, name),
        students:student_id (grade, class_name)
      `)
      .eq('status', 'approved')
      .gte('created_at', cutoff.toISOString()),
    supabase.from('students').select('grade, class_name').eq('is_active', true),
  ]);

  if (ledgerRes.error) throw ledgerRes.error;
  if (studentsRes.error) throw studentsRes.error;

  const studentCounts = new Map<string, number>();
  for (const s of studentsRes.data ?? []) {
    const key = classKey(s.grade as string, s.class_name as string);
    studentCounts.set(key, (studentCounts.get(key) ?? 0) + 1);
  }

  return buildClassActivityAnalysis(
    (ledgerRes.data ?? []) as unknown as ClassActivityLedgerRow[],
    studentCounts,
    days,
  );
}
