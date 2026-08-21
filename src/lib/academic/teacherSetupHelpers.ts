import type {
  AcademicEducationLevel,
  AcademicTeacherAssignment,
  AcademicTeacherSchedule,
  AcademicTeacherSetup,
} from './types';
import { DEFAULT_SECTIONS } from './constants';
import { gradeSectionKey } from './subjectHelpers';

export type TeacherClassRef = {
  level: AcademicEducationLevel;
  grade: number;
  section: string;
};

function classRefKey(ref: TeacherClassRef): string {
  return `${ref.level}_${ref.grade}_${ref.section}`;
}

function sortClassRefs(a: TeacherClassRef, b: TeacherClassRef): number {
  if (a.level !== b.level) return a.level === 'middle' ? -1 : 1;
  if (a.grade !== b.grade) return a.grade - b.grade;
  return a.section.localeCompare(b.section, 'ar');
}

function asLevel(raw: unknown): AcademicEducationLevel | null {
  if (raw === 'middle' || raw === 'high') return raw;
  if (raw === 'متوسط') return 'middle';
  if (raw === 'ثانوي') return 'high';
  return null;
}

function asGradeNum(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** أقسام الصف بمفاتيح متعددة الأشكال (middle_1 | 1 | …) */
function sectionsForSetupGrade(
  setup: AcademicTeacherSetup,
  level: AcademicEducationLevel,
  grade: number,
): string[] {
  const bag = setup.sections_by_grade ?? {};
  const candidates = [
    gradeSectionKey(level, grade),
    `${level}_${grade}`,
    String(grade),
    `${grade}`,
  ];
  for (const key of candidates) {
    const found = bag[key];
    if (Array.isArray(found) && found.length > 0) {
      return found.map((s) => String(s).trim()).filter(Boolean);
    }
  }
  return [];
}

function gradesForSetupLevel(
  setup: AcademicTeacherSetup,
  level: AcademicEducationLevel,
): number[] {
  const bag = setup.grades_by_level ?? {};
  const raw =
    bag[level]
    ?? bag[level === 'middle' ? 'متوسط' : 'ثانوي']
    ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map(asGradeNum).filter((g): g is number => g != null);
}

/** الفصول من إعداد الملف التعليمي */
export function teacherClassRefsFromSetup(setup?: AcademicTeacherSetup | null): TeacherClassRef[] {
  if (!setup) return [];

  const levelsRaw = setup.education_levels?.length
    ? setup.education_levels
    : Object.keys(setup.grades_by_level ?? {});
  const levels = levelsRaw.map(asLevel).filter((l): l is AcademicEducationLevel => !!l);

  const map = new Map<string, TeacherClassRef>();

  for (const level of levels) {
    for (const grade of gradesForSetupLevel(setup, level)) {
      for (const section of sectionsForSetupGrade(setup, level, grade)) {
        const ref = { level, grade, section };
        map.set(classRefKey(ref), ref);
      }
    }
  }

  // احتياطي: قراءة مباشرة من مفاتيح sections_by_grade إن لم تُطابق أعلاه
  if (map.size === 0 && setup.sections_by_grade) {
    for (const [key, sections] of Object.entries(setup.sections_by_grade)) {
      if (!Array.isArray(sections) || !sections.length) continue;
      const m = /^((?:middle|high|متوسط|ثانوي))[_-](\d+)$/u.exec(key.trim());
      if (m) {
        const level = asLevel(m[1]);
        const grade = asGradeNum(m[2]);
        if (!level || grade == null) continue;
        for (const section of sections) {
          const sec = String(section).trim();
          if (!sec) continue;
          const ref = { level, grade, section: sec };
          map.set(classRefKey(ref), ref);
        }
        continue;
      }
      const gradeOnly = asGradeNum(key);
      if (gradeOnly == null) continue;
      const fallbackLevel = levels[0] ?? 'middle';
      for (const section of sections) {
        const sec = String(section).trim();
        if (!sec) continue;
        const ref = { level: fallbackLevel, grade: gradeOnly, section: sec };
        map.set(classRefKey(ref), ref);
      }
    }
  }

  return [...map.values()].sort(sortClassRefs);
}

/** الفصول من إسناد المدير */
export function teacherClassRefsFromAssignments(
  assignments: AcademicTeacherAssignment[] = [],
): TeacherClassRef[] {
  const map = new Map<string, TeacherClassRef>();
  for (const row of assignments) {
    const level = asLevel(row.education_level);
    if (!level) continue;
    const gradesWithSections = row.grades_with_sections ?? {};
    for (const [gradeKey, sectionsRaw] of Object.entries(gradesWithSections)) {
      const grade = asGradeNum(gradeKey);
      if (grade == null) continue;
      // مصفوفة فارغة في الإسناد القديم = كل الفصول الافتراضية
      const sections =
        Array.isArray(sectionsRaw) && sectionsRaw.length > 0
          ? sectionsRaw.map((s) => String(s).trim()).filter(Boolean)
          : [...DEFAULT_SECTIONS];
      for (const section of sections) {
        const ref = { level, grade, section };
        map.set(classRefKey(ref), ref);
      }
    }
  }
  return [...map.values()].sort(sortClassRefs);
}

/** الفصول من الجداول المحفوظة (احتياطي) */
export function teacherClassRefsFromSchedules(schedules: AcademicTeacherSchedule[]): TeacherClassRef[] {
  const map = new Map<string, TeacherClassRef>();
  for (const s of schedules) {
    const level = asLevel(s.education_level);
    const grade = asGradeNum(s.grade);
    const section = String(s.section ?? '').trim();
    if (!level || grade == null || !section) continue;
    const ref = { level, grade, section };
    map.set(classRefKey(ref), ref);
  }
  return [...map.values()].sort(sortClassRefs);
}

/** دمج إعداد المعلم + إسناد المدير + جداوله — بدون تكرار */
export function mergeTeacherClassRefs(
  setup?: AcademicTeacherSetup | null,
  schedules: AcademicTeacherSchedule[] = [],
  assignments: AcademicTeacherAssignment[] = [],
): TeacherClassRef[] {
  const map = new Map<string, TeacherClassRef>();
  for (const ref of teacherClassRefsFromSetup(setup)) {
    map.set(classRefKey(ref), ref);
  }
  for (const ref of teacherClassRefsFromAssignments(assignments)) {
    map.set(classRefKey(ref), ref);
  }
  for (const ref of teacherClassRefsFromSchedules(schedules)) {
    map.set(classRefKey(ref), ref);
  }
  return [...map.values()].sort(sortClassRefs);
}

export function teacherLevelsFromClasses(classes: TeacherClassRef[]): AcademicEducationLevel[] {
  return [...new Set(classes.map((c) => c.level))];
}

export function teacherGradesForLevel(classes: TeacherClassRef[], level: AcademicEducationLevel): number[] {
  return [...new Set(classes.filter((c) => c.level === level).map((c) => c.grade))].sort((a, b) => a - b);
}

export function teacherSectionsForGrade(
  classes: TeacherClassRef[],
  level: AcademicEducationLevel,
  grade: number,
): string[] {
  return classes
    .filter((c) => c.level === level && c.grade === grade)
    .map((c) => c.section)
    .sort((a, b) => a.localeCompare(b, 'ar'));
}

export function findClassRef(
  classes: TeacherClassRef[],
  level: AcademicEducationLevel,
  grade: number,
  section: string,
): TeacherClassRef | undefined {
  return classes.find((c) => c.level === level && c.grade === grade && c.section === section);
}

export function scheduleSlotCount(schedule?: AcademicTeacherSchedule | null): number {
  if (!schedule?.periods?.length) return 0;
  return schedule.periods.filter((p) => !p.is_empty && p.subject.trim()).length;
}
