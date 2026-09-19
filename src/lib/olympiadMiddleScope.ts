import { gradeBelongsToEducationLevel } from './academic/stageScope';
import { exportRowsToExcel } from './exportExcel';

/** صفوف/طلاب ضمن نطاق أولمبياد رائد النشاط — المرحلة المتوسطة فقط */
export function isOlympiadMiddleGrade(grade: string | null | undefined): boolean {
  return gradeBelongsToEducationLevel(grade, 'middle');
}

export function filterOlympiadMiddleStudents<T extends { grade?: string | null }>(
  students: T[],
): T[] {
  return students.filter((s) => isOlympiadMiddleGrade(s.grade));
}

export function filterOlympiadMiddleGrades(grades: string[]): string[] {
  return grades.filter((g) => isOlympiadMiddleGrade(g));
}

export type StudentRosterExportRow = {
  full_name: string;
  national_id?: string | null;
  admission_number?: string | null;
  grade?: string | null;
  class_name?: string | null;
};

/** تصدير أسماء الطلاب: اسم الطالب · رقم الهوية · الصف · الفصل */
export function exportStudentsRosterExcel(
  students: StudentRosterExportRow[],
  fileName = `اسماء-الطلاب-${new Date().toISOString().slice(0, 10)}.xlsx`,
): number {
  const rows = students.map((s) => ({
    'اسم الطالب': s.full_name ?? '',
    'رقم الهوية': s.national_id || s.admission_number || '',
    الصف: s.grade ?? '',
    الفصل: s.class_name ?? '',
  }));
  exportRowsToExcel(rows, 'الطلاب', fileName);
  return rows.length;
}
