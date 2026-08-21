import type { AcademicEducationLevel, AcademicSubject } from './types';
import { formatGradeLabel } from './constants';

/** مواد نشطة لمرحلة وصف محددين */
export function subjectsForGrade(
  subjects: AcademicSubject[],
  level: AcademicEducationLevel,
  grade: number,
): AcademicSubject[] {
  return subjects
    .filter((s) => s.is_active && s.education_level === level && s.grades.includes(grade))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export function subjectNamesForGrade(
  subjects: AcademicSubject[],
  level: AcademicEducationLevel,
  grade: number,
): string[] {
  return subjectsForGrade(subjects, level, grade).map((s) => s.name);
}

/** تقاطع مواد الصف مع مواد المعلم من الإعداد (إن وُجد) */
export function teacherSubjectNamesForGrade(
  allSubjects: AcademicSubject[],
  level: AcademicEducationLevel,
  grade: number,
  teacherSetupSubjects?: string[],
): string[] {
  const forGrade = subjectNamesForGrade(allSubjects, level, grade);
  if (!teacherSetupSubjects?.length) return forGrade;
  const allowed = new Set(teacherSetupSubjects);
  const picked = forGrade.filter((n) => allowed.has(n));
  return picked.length > 0 ? picked : forGrade;
}

export function formatSubjectGrades(level: AcademicEducationLevel, grades: number[]): string {
  if (!grades.length) return '—';
  return [...grades].sort((a, b) => a - b).map((g) => formatGradeLabel(level, g)).join('، ');
}

export function gradeSectionKey(level: AcademicEducationLevel, grade: number): string {
  return `${level}_${grade}`;
}
