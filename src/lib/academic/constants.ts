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

/** أسماء الفصول لواجب واحد */
export function formatHomeworkClassLabels(
  level: AcademicEducationLevel,
  grade: number,
  sections?: string[] | null,
): string[] {
  const secs = (sections ?? []).map((s) => s.trim()).filter(Boolean);
  if (!secs.length) return [formatGradeLabel(level, grade)];
  return secs.map((s) => formatGradeSection(level, grade, s));
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

export const EXAM_REVIEW_TYPES = Object.keys(EXAM_REVIEW_TYPE_LABELS) as Array<
  keyof typeof EXAM_REVIEW_TYPE_LABELS
>;

export const REVIEW_STATUS_LABELS = {
  pending: 'بانتظار المشرف التربوي',
  approved: 'معتمد',
  needsRevision: 'مطلوب تعديل',
  awaitingReviewer: 'بانتظار المراجع',
  awaitingPrincipal: 'بانتظار اعتماد المدير',
  sentToParent: 'منشور للطالب وولي الأمر',
} as const;

export const REVIEW_EVENT_LABELS: Record<string, string> = {
  uploaded: 'رفع الملف',
  archived: 'نسخة سابقة',
  resubmitted: 'رفع نسخة معدّلة',
  approved: 'اعتماد',
  rejected: 'إرجاع للتعديل',
  published: 'نشر للطلاب',
};

export const REVIEW_ACTOR_ROLE_LABELS: Record<string, string> = {
  teacher: 'المعلم',
  supervisor: 'المشرف التربوي',
  reviewer: 'المراجع',
  principal: 'المدير',
  deputy: 'الوكيل',
  admin: 'الإدارة',
};

export function gradesForLevel(level: AcademicEducationLevel): number[] {
  return level === 'high' ? HIGH_GRADES : MIDDLE_GRADES;
}

/** اقتراحات مواد الثانوي عند خلو دليل المواد من مواد هذه المرحلة */
export const HIGH_SCHOOL_SUGGESTED_SUBJECTS = [
  'الدراسات الإسلامية',
  'اللغة العربية',
  'الرياضيات',
  'اللغة الإنجليزية',
  'الفيزياء',
  'الكيمياء',
  'الأحياء',
  'علوم الأرض والفضاء',
  'التقنية الرقمية',
  'التفكير الناقد',
  'الدراسات الاجتماعية',
  'المهارات الحياتية والأسرية',
  'التربية الصحية والبدنية',
  'الإدارة المالية',
  'علم البيئة',
];

/** مسار الصفحة العامة لمراجعات الثانوي (بدون تسجيل دخول) */
export const PUBLIC_SECONDARY_REVIEWS_PATH = '/reviews/secondary';

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
