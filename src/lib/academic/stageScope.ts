import type { AcademicEducationLevel } from './types';
import { olympiadGradeToAcademic, normalizeGradeLabel } from './gradeBridge';

/** هل صف الطالب ينتمي لمرحلة الوكيل (متوسط / ثانوي)؟ */
export function gradeBelongsToEducationLevel(
  grade: string | null | undefined,
  level: AcademicEducationLevel,
): boolean {
  if (!grade?.trim()) return false;
  const parsed = olympiadGradeToAcademic(grade);
  if (parsed) return parsed.level === level;

  const n = normalizeGradeLabel(grade);
  if (level === 'middle') return n.includes('متوسط') && !n.includes('ثانوي');
  return n.includes('ثانوي');
}
