import type { AcademicEducationLevel, AcademicSubject, AcademicTeacherSetup } from './types';
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
  teacherSetupSubjects?: string[] | null,
): string[] {
  const forGrade = subjectNamesForGrade(allSubjects, level, grade);
  if (teacherSetupSubjects == null) return forGrade;
  if (teacherSetupSubjects.length === 0) return forGrade;
  const allowed = new Set(teacherSetupSubjects);
  const matched = forGrade.filter((n) => allowed.has(n));
  // مواد الجدول قد لا تطابق دليل المواد حرفياً — اعرضها كما في الجدول
  if (matched.length > 0) return matched;
  return [...teacherSetupSubjects].sort((a, b) => a.localeCompare(b, 'ar'));
}

/** مواد هذا الصف من إعداد الملف — لا تُعمَّم على بقية الصفوف */
export function subjectsFromTeacherSetup(
  setup: Pick<AcademicTeacherSetup, 'subjects' | 'subjects_by_grade'> | null | undefined,
  level: AcademicEducationLevel,
  grade: number,
): string[] | undefined {
  if (!setup) return undefined;
  const bag = setup.subjects_by_grade;
  if (bag && Object.keys(bag).length > 0) {
    const key = gradeSectionKey(level, grade);
    const found = bag[key] ?? bag[`${level}_${grade}`];
    return Array.isArray(found) ? found : [];
  }
  return setup.subjects;
}

export function flattenSubjectsByGrade(subjectsByGrade: Record<string, string[]>): string[] {
  return [...new Set(Object.values(subjectsByGrade).flat().map((s) => s.trim()).filter(Boolean))];
}

export function formatSubjectGrades(level: AcademicEducationLevel, grades: number[]): string {
  if (!grades.length) return '—';
  return [...grades].sort((a, b) => a - b).map((g) => formatGradeLabel(level, g)).join('، ');
}

export function gradeSectionKey(level: AcademicEducationLevel, grade: number): string {
  return `${level}_${grade}`;
}
