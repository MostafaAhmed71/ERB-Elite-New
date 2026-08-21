import type { AcademicWeeklyPlanEntry } from './types';
import { weeklyPlanEntryKey, DAYS_AR, PERIODS_PER_DAY } from './constants';

export type WeeklyPlanConflict = {
  day: string;
  period: number;
  teacherName: string;
};

function entryOwnerId(
  entry: AcademicWeeklyPlanEntry,
  planOwnerId?: string,
): string | undefined {
  return entry.teacher_id ?? planOwnerId;
}

export function findWeeklyPlanConflicts(
  existing: AcademicWeeklyPlanEntry[],
  newSlots: AcademicWeeklyPlanEntry[],
  teacherId: string,
  planOwnerId?: string,
): WeeklyPlanConflict[] {
  const conflicts: WeeklyPlanConflict[] = [];

  for (const slot of newSlots) {
    if (!slot.lesson_topic?.trim()) continue;

    for (const ex of existing) {
      if (!ex.lesson_topic?.trim()) continue;
      if (ex.day !== slot.day || ex.period !== slot.period) continue;

      const owner = entryOwnerId(ex, planOwnerId);
      if (owner && owner !== teacherId) {
        conflicts.push({
          day: ex.day,
          period: ex.period,
          teacherName: ex.teacher_name ?? 'معلم آخر',
        });
      }
    }
  }

  return conflicts;
}

export function filterEntriesForTeacher(
  entries: AcademicWeeklyPlanEntry[],
  teacherId: string,
  planOwnerId?: string,
): AcademicWeeklyPlanEntry[] {
  return entries.filter((e) => entryOwnerId(e, planOwnerId) === teacherId);
}

export function mergeTeacherSlotsIntoMap(
  scheduleKeys: string[],
  sharedEntries: AcademicWeeklyPlanEntry[],
  teacherId: string,
  planOwnerId?: string,
): Record<string, AcademicWeeklyPlanEntry> {
  const map: Record<string, AcademicWeeklyPlanEntry> = {};
  const mine = filterEntriesForTeacher(sharedEntries, teacherId, planOwnerId);

  for (const key of scheduleKeys) {
    const owned = mine.find((e) => weeklyPlanEntryKey(e.day, e.period) === key);
    if (owned) {
      map[key] = { ...owned };
    }
  }

  return map;
}

export function formatWeeklyPlanConflictMessage(conflicts: WeeklyPlanConflict[]): string {
  if (!conflicts.length) return '';
  const lines = conflicts.map(
    (c) => `${c.day} — الحصة ${c.period} (المعلم: ${c.teacherName})`,
  );
  return `تعارض: الحصة محجوزة لمعلم آخر:\n${lines.join('\n')}`;
}

/** حصة في جدول الفصل — لمعرفة المعلم المسؤول عن كل يوم/حصة */
export type ClassScheduleSlot = {
  day: string;
  period: number;
  subject: string;
  teacherName: string;
};

export type WeeklyGridCell =
  | {
      status: 'filled';
      day: string;
      period: number;
      subject: string;
      lessonTopic: string;
      teacherName?: string;
    }
  | {
      status: 'pending';
      day: string;
      period: number;
      subject: string;
      teacherName: string;
    }
  | { status: 'free'; day: string; period: number };

/**
 * يبني الجدول الأسبوعي الكامل (كل الأيام × كل الحصص) مع تمييز:
 * - filled: حصة أُدخل موضوعها
 * - pending: حصة مجدولة لمعلم لكنه لم يُدخل موضوعها بعد
 * - free: لا حصة مجدولة لهذا الفصل في هذا الوقت
 */
export function buildWeeklyGrid(
  entries: AcademicWeeklyPlanEntry[],
  scheduleSlots: ClassScheduleSlot[],
): WeeklyGridCell[][] {
  const entryByKey = new Map<string, AcademicWeeklyPlanEntry>();
  for (const e of entries) {
    if (e.lesson_topic?.trim()) entryByKey.set(weeklyPlanEntryKey(e.day, e.period), e);
  }
  const slotByKey = new Map<string, ClassScheduleSlot>();
  for (const s of scheduleSlots) {
    const key = weeklyPlanEntryKey(s.day, s.period);
    if (!slotByKey.has(key)) slotByKey.set(key, s);
  }

  return DAYS_AR.map((day) =>
    PERIODS_PER_DAY.map((period): WeeklyGridCell => {
      const key = weeklyPlanEntryKey(day, period);
      const entry = entryByKey.get(key);
      if (entry) {
        return {
          status: 'filled',
          day,
          period,
          subject: entry.subject,
          lessonTopic: entry.lesson_topic,
          teacherName: entry.teacher_name,
        };
      }
      const slot = slotByKey.get(key);
      if (slot) {
        return {
          status: 'pending',
          day,
          period,
          subject: slot.subject,
          teacherName: slot.teacherName,
        };
      }
      return { status: 'free', day, period };
    }),
  );
}
