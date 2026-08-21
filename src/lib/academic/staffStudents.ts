import { supabase } from '../supabase';
import { extractErrorMessage } from '../errors';
import type { AcademicEducationLevel } from './types';
import { gradeBelongsToEducationLevel } from './stageScope';
import { fetchStageClassKeys, type ClassKey } from './classAttendance';

export type StaffStudentRow = {
  id: string;
  full_name: string;
  admission_number: string | null;
  national_id: string | null;
  grade: string;
  class_name: string;
  phone: string | null;
  points: number;
};

export type ClassKeyWithCount = ClassKey & { student_count: number };

/** كل فصول المدرسة مع العدد — للمدير */
export async function fetchAllClassKeys(): Promise<ClassKeyWithCount[]> {
  const { data, error } = await supabase
    .from('students')
    .select('grade, class_name')
    .eq('is_active', true);
  if (error) throw error;

  const map = new Map<string, ClassKeyWithCount>();
  for (const row of data ?? []) {
    const grade = row.grade?.trim();
    const class_name = row.class_name?.trim();
    if (!grade || !class_name) continue;
    const key = `${grade}__${class_name}`;
    const cur = map.get(key);
    if (cur) cur.student_count += 1;
    else map.set(key, { grade, class_name, student_count: 1 });
  }
  return Array.from(map.values()).sort(
    (a, b) => a.grade.localeCompare(b.grade, 'ar') || a.class_name.localeCompare(b.class_name, 'ar'),
  );
}

export async function fetchScopedClassKeys(
  level: AcademicEducationLevel | null,
): Promise<ClassKeyWithCount[]> {
  if (level) return fetchStageClassKeys(level);
  return fetchAllClassKeys();
}

async function fetchApprovedPointsMap(studentIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (studentIds.length === 0) return map;

  const chunkSize = 200;
  for (let i = 0; i < studentIds.length; i += chunkSize) {
    const chunk = studentIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('points_ledger')
      .select('student_id, points')
      .eq('status', 'approved')
      .in('student_id', chunk);
    if (error) throw error;
    for (const row of data ?? []) {
      map.set(row.student_id, (map.get(row.student_id) ?? 0) + (row.points ?? 0));
    }
  }
  return map;
}

export async function listStaffStudents(opts: {
  level?: AcademicEducationLevel | null;
  grade?: string;
  className?: string;
  search?: string;
}): Promise<StaffStudentRow[]> {
  let q = supabase
    .from('students')
    .select('id, full_name, admission_number, national_id, grade, class_name, phone')
    .eq('is_active', true)
    .order('full_name');

  if (opts.grade?.trim()) q = q.eq('grade', opts.grade.trim());
  if (opts.className?.trim()) q = q.eq('class_name', opts.className.trim());

  const { data, error } = await q;
  if (error) throw error;

  let rows = (data ?? []).filter((s) => {
    if (opts.level && !gradeBelongsToEducationLevel(s.grade, opts.level)) return false;
    return true;
  });

  const search = opts.search?.trim();
  if (search) {
    const n = search.toLowerCase();
    rows = rows.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(n) ||
        s.admission_number?.includes(search) ||
        s.national_id?.includes(search),
    );
  }

  const pointsMap = await fetchApprovedPointsMap(rows.map((r) => r.id));

  return rows.map((s) => ({
    id: s.id,
    full_name: s.full_name,
    admission_number: s.admission_number ?? null,
    national_id: s.national_id ?? null,
    grade: s.grade ?? '',
    class_name: s.class_name ?? '',
    phone: s.phone ?? null,
    points: pointsMap.get(s.id) ?? 0,
  }));
}

/** إجماليات حسب النطاق الحالي */
export function computeStudentTotals(
  classKeys: ClassKeyWithCount[],
  grade: string,
  className: string,
  scopeLabel = 'النطاق',
): { label: string; count: number } {
  if (grade && className) {
    const hit = classKeys.find((c) => c.grade === grade && c.class_name === className);
    return { label: `إجمالي طلاب ${grade} — فصل ${className}`, count: hit?.student_count ?? 0 };
  }
  if (grade) {
    const count = classKeys.filter((c) => c.grade === grade).reduce((n, c) => n + c.student_count, 0);
    return { label: `إجمالي طلاب ${grade}`, count };
  }
  const count = classKeys.reduce((n, c) => n + c.student_count, 0);
  return { label: `إجمالي طلاب ${scopeLabel}`, count };
}

export async function transferStudentClass(
  studentId: string,
  newGrade: string,
  newClass: string,
): Promise<{ approved_points: number; to_grade: string; to_class: string }> {
  const { data, error } = await supabase.rpc('transfer_student_class', {
    p_student_id: studentId,
    p_new_grade: newGrade.trim(),
    p_new_class: newClass.trim(),
  });
  if (error) throw new Error(extractErrorMessage(error));
  const result = data as {
    approved_points?: number;
    to_grade?: string;
    to_class?: string;
  } | null;
  return {
    approved_points: result?.approved_points ?? 0,
    to_grade: result?.to_grade ?? newGrade,
    to_class: result?.to_class ?? newClass,
  };
}
