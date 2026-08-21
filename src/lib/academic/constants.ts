import type { AcademicEducationLevel, AcademicSemester } from './types';

export const ACADEMIC_LEVEL_LABELS: Record<AcademicEducationLevel, string> = {
  middle: 'متوسط',
  high: 'ثانوي',
};

export const MIDDLE_GRADES = [1, 2, 3];
export const HIGH_GRADES = [1, 2, 3];

/** ترتيب الصف بالعربية */
export const GRADE_ORDINAL_AR: Record<number, string> = {
  1: 'الأول',
  2: 'الثاني',
  3: 'الثالث',
};

/** اسم الصف الكامل — مثال: الصف الأول المتوسط */
export function formatGradeLabel(level: AcademicEducationLevel, grade: number): string {
  const ordinal = GRADE_ORDINAL_AR[grade] ?? String(grade);
  return `الصف ${ordinal} ${ACADEMIC_LEVEL_LABELS[level]}`;
}

/** صف + فصل — مثال: الصف الأول المتوسط — فصل أ */
export function formatGradeSection(level: AcademicEducationLevel, grade: number, section: string): string {
  return `${formatGradeLabel(level, grade)} — فصل ${section}`;
}

/** عند غياب المرحلة — الصف الأول فقط */
export function formatGradeOrdinal(grade: number): string {
  const ordinal = GRADE_ORDINAL_AR[grade] ?? String(grade);
  return `الصف ${ordinal}`;
}

export function formatGradeWithLevel(
  level: AcademicEducationLevel | undefined | null,
  grade: number,
): string {
  if (level) return formatGradeLabel(level, grade);
  return formatGradeOrdinal(grade);
}

export const DEFAULT_SECTIONS = ['أ', 'ب', 'ج', 'د'];
export const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
export const PERIODS_PER_DAY = [1, 2, 3, 4, 5, 6] as const;

export function weeklyPlanEntryKey(day: string, period: number): string {
  return `${day}_${period}`;
}

export const HOMEWORK_TYPE_LABELS = {
  grammar: 'قواعد',
  conversation: 'محادثة',
  reading: 'قراءة',
} as const;

export const EXAM_REVIEW_TYPE_LABELS = {
  exam: 'اختبار',
  solvedReview: 'مراجعة محلولة',
  unsolvedReview: 'مراجعة غير محلولة',
  testSchedule: 'جدول الاختبارات',
} as const;

export const REVIEW_STATUS_LABELS = {
  pending: 'بانتظار المراجع',
  approved: 'معتمد',
  needsRevision: 'يحتاج تعديل',
  awaitingPrincipal: 'بانتظار اعتماد المدير',
  sentToParent: 'منشور للطالب وولي الأمر',
} as const;

export function gradesForLevel(level: AcademicEducationLevel): number[] {
  return level === 'high' ? HIGH_GRADES : MIDDLE_GRADES;
}

/** الفصل الأول: 20 أسبوع — الفصل الثاني: 22 أسبوع */
export const SEMESTER_WEEKS: Record<AcademicSemester, number> = {
  1: 20,
  2: 22,
};

/** أيام الدراسة في الأسبوع (أحد–خميس) — للتوليد التلقائي لمواعيد الأسابيع */
export const SCHOOL_DAYS_PER_WEEK = 5;

export const SEMESTER_LABELS: Record<AcademicSemester, string> = {
  1: 'الفصل الدراسي الأول',
  2: 'الفصل الدراسي الثاني',
};

export const SEMESTER_SHORT_LABELS: Record<AcademicSemester, string> = {
  1: 'الفصل الأول',
  2: 'الفصل الثاني',
};

export function maxWeeksForSemester(semester: AcademicSemester): number {
  return SEMESTER_WEEKS[semester];
}

export function weekOptionsForSemester(semester: AcademicSemester): number[] {
  return Array.from({ length: SEMESTER_WEEKS[semester] }, (_, i) => i + 1);
}

export function clampWeekToSemester(semester: AcademicSemester, week: number): number {
  return Math.min(Math.max(1, week), SEMESTER_WEEKS[semester]);
}

export function formatSemesterWeek(semester: AcademicSemester, week: number): string {
  return `${SEMESTER_SHORT_LABELS[semester]} — الأسبوع ${week}`;
}

export function getDefaultSemesterWeek(): { semester: AcademicSemester; week: number } {
  return { semester: 1, week: 1 };
}

/** @deprecated استخدم getDefaultSemesterWeek — الأسبوع مرتبط بالفصل الدراسي */
export function getCurrentWeekNumber(_date = new Date()): number {
  return 1;
}
