import type { ClassScheduleSlot } from './weeklyPlanHelpers';
import type { AcademicScheduleWithTeacher } from './teacherService';
import type { AcademicTeacherSchedule } from './types';

export function classScheduleKey(level: string, grade: number, section: string): string {
  return `${level}_${grade}_${section}`;
}

type ScheduleInput = {
  education_level: string;
  grade: number;
  section: string;
  periods: { day: string; period: number; subject: string; is_empty: boolean }[];
  teacherName: string;
};

export function buildScheduleSlotsByClass(
  schedules: ScheduleInput[],
): Map<string, ClassScheduleSlot[]> {
  const map = new Map<string, ClassScheduleSlot[]>();
  for (const s of schedules) {
    const key = classScheduleKey(s.education_level, s.grade, s.section);
    const list = map.get(key) ?? [];
    for (const p of s.periods) {
      if (p.is_empty || !p.subject?.trim()) continue;
      list.push({
        day: p.day,
        period: p.period,
        subject: p.subject.trim(),
        teacherName: s.teacherName,
      });
    }
    map.set(key, list);
  }
  return map;
}

export function scheduleInputsFromTeacherSchedules(
  items: AcademicTeacherSchedule[],
  teacherName: string,
): ScheduleInput[] {
  return items.map((s) => ({
    education_level: s.education_level,
    grade: s.grade,
    section: s.section,
    periods: s.periods ?? [],
    teacherName,
  }));
}

export function scheduleInputsFromStaffSchedules(
  items: AcademicScheduleWithTeacher[],
): ScheduleInput[] {
  return items.map((s) => ({
    education_level: s.education_level,
    grade: s.grade,
    section: s.section,
    periods: s.periods ?? [],
    teacherName: s.teacher?.full_name ?? 'معلم غير معروف',
  }));
}
