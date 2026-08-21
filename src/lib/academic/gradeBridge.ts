import type { AcademicEducationLevel } from './types';
import { ACADEMIC_LEVEL_LABELS, GRADE_ORDINAL_AR } from './constants';

/** الصيغة المعتمدة في نظام الأولمبياد (مطابقة grade_class_catalog الافتراضي) */
export const OLYMPIAD_GRADE_BY_ACADEMIC: Record<AcademicEducationLevel, Record<number, string>> = {
  middle: {
    1: 'أول متوسط',
    2: 'ثاني متوسط',
    3: 'ثالث متوسط',
  },
  high: {
    1: 'أول ثانوي',
    2: 'ثاني ثانوي',
    3: 'ثالث ثانوي',
  },
};

/** تحويل مرحلة + رقم صف → صيغة الأولمبياد */
export function academicToOlympiadGrade(level: AcademicEducationLevel, grade: number): string {
  return OLYMPIAD_GRADE_BY_ACADEMIC[level]?.[grade]
    ?? `${GRADE_ORDINAL_AR[grade] ?? grade} ${ACADEMIC_LEVEL_LABELS[level]}`;
}

/** تطبيع نص الصف للمقارنة (يدعم: أول متوسط / الاول متوسط / الأول المتوسط / الصف الأول المتوسط) */
export function normalizeGradeLabel(raw: string): string {
  // ملاحظة: \b في JS لا يعمل مع العربية — لا تستخدمه هنا
  let s = raw
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^الصف\s+/u, '')
    .replace(/[أإآٱ]/gu, 'ا')
    .replace(/ة/gu, 'ه')
    .toLowerCase();
  // توحيد الترتيبي + أداة التعريف على المرحلة
  s = s
    .replace(/الاول/gu, 'اول')
    .replace(/الثاني/gu, 'ثاني')
    .replace(/الثالث/gu, 'ثالث')
    .replace(/المتوسط/gu, 'متوسط')
    .replace(/الثانوي/gu, 'ثانوي');
  return s;
}

/** تطبيع اسم الفصل: «أ» / «فصل أ» */
export function normalizeClassName(raw: string): string {
  return raw
    .trim()
    .replace(/^فصل\s+/u, '')
    .replace(/[أإآ]/gu, 'ا')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** مقارنة صفيْن بغض النظر عن اختلاف الصياغة */
export function gradesMatch(a: string, b: string): boolean {
  return normalizeGradeLabel(a) === normalizeGradeLabel(b);
}

/** مقارنة فصلين */
export function classesMatch(a: string, b: string): boolean {
  return normalizeClassName(a) === normalizeClassName(b);
}

/** هل نص الصف في الأولمبياد يطابق مرحلة + رقم صف أكاديمي؟ */
export function olympiadGradeMatchesAcademic(
  olympiadGrade: string,
  level: AcademicEducationLevel,
  grade: number,
): boolean {
  const target = normalizeGradeLabel(academicToOlympiadGrade(level, grade));
  const candidate = normalizeGradeLabel(olympiadGrade);
  if (target === candidate) return true;

  const ordinal = GRADE_ORDINAL_AR[grade] ?? String(grade);
  const levelLabel = ACADEMIC_LEVEL_LABELS[level];
  const variants = [
    academicToOlympiadGrade(level, grade),
    `ال${ordinal} ${levelLabel}`,
    `الصف ${ordinal} ${levelLabel}`,
    `${ordinal} ${levelLabel}`,
  ];
  return variants.some((v) => normalizeGradeLabel(v) === candidate);
}

/** محاولة عكس صيغة الأولمبياد إلى مرحلة + رقم صف */
export function olympiadGradeToAcademic(
  olympiadGrade: string,
): { level: AcademicEducationLevel; grade: number } | null {
  const n = normalizeGradeLabel(olympiadGrade);
  for (const level of ['middle', 'high'] as AcademicEducationLevel[]) {
    for (const [gradeStr, label] of Object.entries(OLYMPIAD_GRADE_BY_ACADEMIC[level])) {
      if (normalizeGradeLabel(label) === n) {
        return { level, grade: Number(gradeStr) };
      }
    }
  }
  return null;
}
