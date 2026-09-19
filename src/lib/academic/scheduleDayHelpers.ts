import { DAYS_AR } from './constants';
import type { AcademicEducationLevel, AcademicTeacherSchedule } from './types';
import type { TeacherClassRef } from './teacherSetupHelpers';
import { RIYADH_TZ } from '../competition/time';

export type ScheduleDaySlot = TeacherClassRef & {
  subject: string;
  period: number;
};

function classRefKey(ref: TeacherClassRef): string {
  return `${ref.level}_${ref.grade}_${ref.section}`;
}

function normalizeDayName(day: string): string {
  return day.trim().replace(/[إأآ]/g, 'ا');
}

function dayMatches(scheduleDay: string, targetDay: string): boolean {
  return normalizeDayName(scheduleDay) === normalizeDayName(targetDay);
}

function sortClassRefs(a: TeacherClassRef, b: TeacherClassRef): number {
  if (a.level !== b.level) return a.level === 'middle' ? -1 : 1;
  if (a.grade !== b.grade) return a.grade - b.grade;
  return a.section.localeCompare(b.section, 'ar');
}

/** يوم دراسي من تاريخ YYYY-MM-DD بتوقيت الرياض — null في الجمعة/السبت */
export function getSchoolDayFromDate(dateInput: string | Date): string | null {
  const date =
    typeof dateInput === 'string'
      ? new Date(`${dateInput}T12:00:00+03:00`)
      : dateInput;
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: RIYADH_TZ,
    weekday: 'long',
  }).format(date);
  const index: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
  };
  const i = index[dayName];
  if (i == null) return null;
  return DAYS_AR[i] ?? null;
}

/** حصص المعلم في يوم محدد (غير فارغة) */
export function scheduleDaySlots(
  schedules: AcademicTeacherSchedule[],
  day: string,
): ScheduleDaySlot[] {
  const out: ScheduleDaySlot[] = [];
  for (const row of schedules) {
    const level = row.education_level;
    const grade = Number(row.grade);
    const section = String(row.section ?? '').trim();
    if (!section || !Number.isFinite(grade)) continue;

    for (const p of row.periods ?? []) {
      if (!dayMatches(p.day, day) || p.is_empty || !p.subject?.trim()) continue;
      out.push({
        level,
        grade,
        section,
        subject: p.subject.trim(),
        period: p.period,
      });
    }
  }
  return out;
}

/** فصول المعلم التي له فيها حصة في هذا اليوم */
export function teacherClassesForScheduleDay(
  schedules: AcademicTeacherSchedule[],
  day: string,
): TeacherClassRef[] {
  const map = new Map<string, TeacherClassRef>();
  for (const slot of scheduleDaySlots(schedules, day)) {
    map.set(classRefKey(slot), {
      level: slot.level,
      grade: slot.grade,
      section: slot.section,
    });
  }
  return [...map.values()].sort(sortClassRefs);
}

/** مواد المعلم في يوم/صف محدد */
export function subjectsForClassOnDay(
  schedules: AcademicTeacherSchedule[],
  day: string,
  level: AcademicEducationLevel,
  grade: number,
): string[] {
  const subjects = new Set<string>();
  for (const slot of scheduleDaySlots(schedules, day)) {
    if (slot.level !== level || slot.grade !== grade) continue;
    subjects.add(slot.subject);
  }
  return [...subjects].sort((a, b) => a.localeCompare(b, 'ar'));
}

/** فصول لها حصة مادة محددة في يوم/صف */
export function sectionsForClassSubjectOnDay(
  schedules: AcademicTeacherSchedule[],
  day: string,
  level: AcademicEducationLevel,
  grade: number,
  subject: string,
): string[] {
  const needle = subject.trim();
  if (!needle) return [];

  return [...new Set(
    scheduleDaySlots(schedules, day)
      .filter((s) => s.level === level && s.grade === grade && s.subject === needle)
      .map((s) => s.section),
  )].sort((a, b) => a.localeCompare(b, 'ar'));
}

/** هل للمعلم حصص في تاريخ محدد؟ */
export function teacherHasClassesOnDate(
  schedules: AcademicTeacherSchedule[],
  dateInput: string | Date,
): boolean {
  const day = getSchoolDayFromDate(dateInput);
  if (!day) return false;
  return teacherClassesForScheduleDay(schedules, day).length > 0;
}

/** ضمان بقاء فصول الواجب القديم عند التعديل */
export function mergeClassRefsWithInitial(
  classes: TeacherClassRef[],
  initial?: { education_level: AcademicEducationLevel; grade: number; sections?: string[] },
): TeacherClassRef[] {
  if (!initial?.sections?.length) return classes;

  const map = new Map(classes.map((c) => [classRefKey(c), c]));
  for (const section of initial.sections) {
    const ref: TeacherClassRef = {
      level: initial.education_level,
      grade: initial.grade,
      section,
    };
    map.set(classRefKey(ref), ref);
  }
  return [...map.values()].sort(sortClassRefs);
}
