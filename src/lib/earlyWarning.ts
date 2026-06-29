import { computeWeightedScore, getCategoryBreakdown, getFinalScore, type PointEntry } from './calculations';
import { getLevelInfoFromConfig, type AxisWeights, type ExcellenceLevel } from './schoolConfig';

export type WarningLevel = 'academic' | 'behavior' | 'untapped';

export type StudentWarning = {
  studentId: string;
  fullName: string;
  grade: string;
  class_name: string;
  level: WarningLevel;
  label: string;
  detail: string;
};

type StudentRow = {
  id: string;
  full_name: string;
  grade: string;
  class_name: string;
};

type LedgerRow = {
  student_id: string;
  points: number;
  status: string;
  activity_id: string | null;
  activities: { category: string } | null;
};

type ExamRow = {
  student_id: string;
  score: number;
  max_score: number;
};

export function classifyStudentWarnings(
  students: StudentRow[],
  ledger: LedgerRow[],
  examResults: ExamRow[],
  weights?: AxisWeights
): StudentWarning[] {
  const warnings: StudentWarning[] = [];

  const ledgerByStudent = new Map<string, PointEntry[]>();
  for (const row of ledger) {
    if (row.status !== 'approved') continue;
    if (!ledgerByStudent.has(row.student_id)) ledgerByStudent.set(row.student_id, []);
    ledgerByStudent.get(row.student_id)!.push({
      id: row.student_id,
      points: row.points,
      status: 'approved',
      activity_id: row.activity_id ?? '',
      activities: row.activities ? { name: '', category: row.activities.category } : null,
    });
  }

  const examsByStudent = new Map<string, ExamRow[]>();
  for (const r of examResults) {
    if (!examsByStudent.has(r.student_id)) examsByStudent.set(r.student_id, []);
    examsByStudent.get(r.student_id)!.push(r);
  }

  for (const student of students) {
    const entries = ledgerByStudent.get(student.id) ?? [];
    const breakdown = getCategoryBreakdown(entries);
    const score = weights
      ? computeWeightedScore(breakdown, weights)
      : getFinalScore(entries);

    const exams = examsByStudent.get(student.id) ?? [];
    const avgExamPct =
      exams.length > 0
        ? exams.reduce((s, e) => s + (e.max_score > 0 ? e.score / e.max_score : 0), 0) / exams.length
        : null;

    const negativeBehavior = entries.filter(
      (e) => e.activities?.category === 'behavior' && e.points < 0
    ).length;

    if (avgExamPct != null && avgExamPct < 0.5 && exams.length >= 2) {
      warnings.push({
        studentId: student.id,
        fullName: student.full_name,
        grade: student.grade,
        class_name: student.class_name,
        level: 'academic',
        label: 'خطر أكاديمي',
        detail: `متوسط الاختبارات ${Math.round(avgExamPct * 100)}%`,
      });
      continue;
    }

    if (negativeBehavior >= 3) {
      warnings.push({
        studentId: student.id,
        fullName: student.full_name,
        grade: student.grade,
        class_name: student.class_name,
        level: 'behavior',
        label: 'خطر سلوكي',
        detail: `${negativeBehavior} رصد سلوكي سلبي`,
      });
      continue;
    }

    if (score >= 400 && breakdown.activity < 30) {
      warnings.push({
        studentId: student.id,
        fullName: student.full_name,
        grade: student.grade,
        class_name: student.class_name,
        level: 'untapped',
        label: 'متميز بلا متابعة',
        detail: 'نقاط عالية لكن مشاركة نشاط منخفضة',
      });
    }
  }

  return warnings.sort((a, b) => a.level.localeCompare(b.level));
}

export const WARNING_COLORS: Record<WarningLevel, string> = {
  academic: 'bg-red-500/10 border-red-500/25 text-red-300',
  behavior: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
  untapped: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
};

/** إنذارات أكاديمية فقط — للوحة المدير (بدون نقاط) */
export function classifyExamWarnings(
  students: StudentRow[],
  examResults: ExamRow[]
): StudentWarning[] {
  const examsByStudent = new Map<string, ExamRow[]>();
  for (const r of examResults) {
    if (!examsByStudent.has(r.student_id)) examsByStudent.set(r.student_id, []);
    examsByStudent.get(r.student_id)!.push(r);
  }

  const warnings: StudentWarning[] = [];
  for (const student of students) {
    const exams = examsByStudent.get(student.id) ?? [];
    if (exams.length < 2) continue;
    const avgPct =
      exams.reduce((s, e) => s + (e.max_score > 0 ? e.score / e.max_score : 0), 0) / exams.length;
    if (avgPct < 0.5) {
      warnings.push({
        studentId: student.id,
        fullName: student.full_name,
        grade: student.grade,
        class_name: student.class_name,
        level: 'academic',
        label: 'خطر أكاديمي',
        detail: `متوسط الاختبارات ${Math.round(avgPct * 100)}%`,
      });
    }
  }
  return warnings;
}
