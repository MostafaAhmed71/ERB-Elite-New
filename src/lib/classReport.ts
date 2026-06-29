import type { PointEntry } from './calculations';
import { getCategoryBreakdown } from './calculations';
import type { DbStudent } from '../types';
import { simpleAttendanceCounts, type AttendanceRecord } from './attendanceScore';

export type ClassAxisRow = {
  key: string;
  grade: string;
  class_name: string;
  label: string;
  studentCount: number;
  activity: number;
  behavior: number;
  achievement: number;
  initiative: number;
  weighted: number;
  grantCount: number;
};

type LedgerRow = {
  student_id: string;
  points: number;
  status: string;
  activity_id: string | null;
  activities: { category: string } | null;
  students: { grade: string; class_name: string; full_name: string } | null;
};

export type ClassGrantLedgerRow = {
  grade: string;
  class_name: string;
  points: number;
  status: string;
  activity_id: string | null;
  created_at?: string;
  activities: { category: string } | null;
};

function ensureClassRow(byClass: Map<string, ClassAxisRow>, grade: string, class_name: string): ClassAxisRow {
  const key = `${grade}__${class_name}`;
  if (!byClass.has(key)) {
    byClass.set(key, {
      key,
      grade,
      class_name,
      label: `${grade} — ${class_name}`,
      studentCount: 0,
      activity: 0,
      behavior: 0,
      achievement: 0,
      initiative: 0,
      weighted: 0,
      grantCount: 0,
    });
  }
  return byClass.get(key)!;
}

function applyClassGrantToRow(row: ClassAxisRow, grant: ClassGrantLedgerRow) {
  const breakdown = getCategoryBreakdown([
    {
      id: 'class-grant',
      points: grant.points,
      status: 'approved',
      activity_id: grant.activity_id ?? '',
      activities: grant.activities
        ? { name: '', category: grant.activities.category }
        : null,
    },
  ]);
  row.activity += breakdown.activity;
  row.behavior += breakdown.behavior;
  row.achievement += breakdown.achievement;
  row.initiative += breakdown.initiative;
  row.weighted += breakdown.weighted;
  row.grantCount += 1;
}

export function buildClassAxisReport(
  ledger: LedgerRow[],
  classGrants: ClassGrantLedgerRow[] = []
): ClassAxisRow[] {
  const byStudent = new Map<string, { grade: string; class_name: string; entries: PointEntry[] }>();

  for (const row of ledger) {
    if (row.status !== 'approved' || !row.students) continue;
    const sid = row.student_id;
    if (!byStudent.has(sid)) {
      byStudent.set(sid, {
        grade: row.students.grade,
        class_name: row.students.class_name,
        entries: [],
      });
    }
    byStudent.get(sid)!.entries.push({
      id: sid,
      points: row.points,
      status: 'approved',
      activity_id: row.activity_id ?? '',
      activities: row.activities
        ? { name: '', category: row.activities.category }
        : null,
    });
  }

  const byClass = new Map<string, ClassAxisRow>();

  for (const [, student] of byStudent) {
    const key = `${student.grade}__${student.class_name}`;
    if (!byClass.has(key)) {
      byClass.set(key, {
        key,
        grade: student.grade,
        class_name: student.class_name,
        label: `${student.grade} — ${student.class_name}`,
        studentCount: 0,
        activity: 0,
        behavior: 0,
        achievement: 0,
        initiative: 0,
        weighted: 0,
        grantCount: 0,
      });
    }
    const row = byClass.get(key)!;
    const breakdown = getCategoryBreakdown(student.entries);
    row.studentCount += 1;
    row.activity += breakdown.activity;
    row.behavior += breakdown.behavior;
    row.achievement += breakdown.achievement;
    row.initiative += breakdown.initiative;
    row.weighted += breakdown.weighted;
    row.grantCount += student.entries.length;
  }

  for (const grant of classGrants) {
    if (grant.status !== 'approved') continue;
    const row = ensureClassRow(byClass, grant.grade, grant.class_name);
    applyClassGrantToRow(row, grant);
  }

  return Array.from(byClass.values()).sort((a, b) => b.weighted - a.weighted);
}

export function averagePerStudent(row: ClassAxisRow, field: keyof Pick<ClassAxisRow, 'activity' | 'behavior' | 'achievement' | 'initiative' | 'weighted'>) {
  if (row.studentCount === 0) return 0;
  return Math.round(row[field] / row.studentCount);
}

export type ClassStudentPointsRow = {
  student_id: string;
  full_name: string;
  admission_number: string;
  grade: string;
  class_name: string;
  activity: number;
  behavior: number;
  achievement: number;
  initiative: number;
  weighted: number;
  grantCount: number;
  grants: Array<{ name: string; points: number; category: string }>;
  attendancePresent: number;
  attendanceAbsent: number;
};

type StudentLedgerRow = {
  student_id: string;
  points: number;
  status: string;
  activity_id: string | null;
  activities: { name: string; category: string } | null;
};

export function buildClassStudentPointsRows(
  students: Array<Pick<DbStudent, 'id' | 'full_name' | 'admission_number' | 'grade' | 'class_name'>>,
  ledger: StudentLedgerRow[],
  attendanceByStudent: Map<string, AttendanceRecord[]> = new Map(),
): ClassStudentPointsRow[] {
  const studentIds = new Set(students.map((s) => s.id));
  const entriesByStudent = new Map<string, PointEntry[]>();
  const grantsByStudent = new Map<string, ClassStudentPointsRow['grants']>();

  for (const row of ledger) {
    if (row.status !== 'approved' || !studentIds.has(row.student_id)) continue;

    if (!entriesByStudent.has(row.student_id)) {
      entriesByStudent.set(row.student_id, []);
      grantsByStudent.set(row.student_id, []);
    }

    entriesByStudent.get(row.student_id)!.push({
      id: row.student_id,
      points: row.points,
      status: 'approved',
      activity_id: row.activity_id ?? '',
      activities: row.activities
        ? { name: row.activities.name, category: row.activities.category }
        : null,
    });

    const actName = row.activities?.name ?? 'عام';
    const grants = grantsByStudent.get(row.student_id)!;
    const existing = grants.find((g) => g.name === actName && g.category === (row.activities?.category ?? 'activity'));
    if (existing) {
      existing.points += row.points;
    } else {
      grants.push({
        name: actName,
        points: row.points,
        category: row.activities?.category ?? 'activity',
      });
    }
  }

  return students
    .map((student) => {
      const entries = entriesByStudent.get(student.id) ?? [];
      const breakdown = getCategoryBreakdown(entries);
      const grants = [...(grantsByStudent.get(student.id) ?? [])].sort((a, b) => b.points - a.points);
      const attendance = simpleAttendanceCounts(attendanceByStudent.get(student.id) ?? []);
      return {
        student_id: student.id,
        full_name: student.full_name,
        admission_number: student.admission_number,
        grade: student.grade,
        class_name: student.class_name,
        activity: breakdown.activity,
        behavior: breakdown.behavior,
        achievement: breakdown.achievement,
        initiative: breakdown.initiative,
        weighted: breakdown.weighted,
        grantCount: entries.length,
        grants,
        attendancePresent: attendance.present,
        attendanceAbsent: attendance.absent,
      };
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
}
