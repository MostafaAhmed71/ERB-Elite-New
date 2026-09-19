import type { AcademicSchedulePeriod, AcademicWeeklyPlan, AcademicWeeklyPlanEntry, AcademicEducationLevel } from './types';
import { weeklyPlanEntryKey, DAYS_AR, PERIODS_PER_DAY } from './constants';

export type WeeklyPlanConflict = {
  day: string;
  period: number;
  teacherName: string;
};

export function sameTeacherId(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

export function normalizePlanEntries(raw: unknown): AcademicWeeklyPlanEntry[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      return normalizePlanEntries(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => ({
    day: String(e.day ?? ''),
    period: Number(e.period),
    subject: String(e.subject ?? ''),
    lesson_topic: String(e.lesson_topic ?? ''),
    teacher_id: e.teacher_id ? String(e.teacher_id) : undefined,
    teacher_name: e.teacher_name ? String(e.teacher_name) : undefined,
  }));
}

function entryOwnerId(
  entry: AcademicWeeklyPlanEntry,
  planOwnerId?: string,
): string | undefined {
  return entry.teacher_id ?? planOwnerId;
}

/** هل للمعلم حصص فعلية في هذه الخطة؟ */
export function teacherPlanHasContent(plan: AcademicWeeklyPlan, teacherId: string): boolean {
  const entries = normalizePlanEntries(plan.entries);
  if (sameTeacherId(plan.teacher_id, teacherId)) {
    return entries.some((e) => e.lesson_topic.trim());
  }
  return filterEntriesForTeacher(entries, teacherId, plan.teacher_id).some((e) => e.lesson_topic.trim());
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
  entries: AcademicWeeklyPlanEntry[] | unknown,
  teacherId: string,
  planOwnerId?: string,
): AcademicWeeklyPlanEntry[] {
  const list = normalizePlanEntries(entries);
  return list.filter((e) => sameTeacherId(entryOwnerId(e, planOwnerId), teacherId));
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

function normalizeSubjectName(subject: string | undefined): string {
  return (subject ?? '').trim().replace(/\s+/g, ' ');
}

/** موضوع واحد لكل مادة من المصدر — آخر إدخال يغلب عند التكرار */
function buildTopicBySubject(source: AcademicWeeklyPlanEntry[]): Map<string, string> {
  const sorted = [...source].sort(
    (a, b) =>
      DAYS_AR.indexOf(a.day) - DAYS_AR.indexOf(b.day) || a.period - b.period,
  );
  const map = new Map<string, string>();
  for (const e of sorted) {
    if (!e.lesson_topic?.trim()) continue;
    const subj = normalizeSubjectName(e.subject);
    if (!subj) continue;
    map.set(subj, e.lesson_topic.trim());
  }
  return map;
}

/** نسخ الموضوع إلى فصل آخر — المطابقة بالمادة فقط (كل حصص نفس المادة تحصل على الموضوع) */
export function copyLessonTopicsToMatchingSlots(
  source: AcademicWeeklyPlanEntry[],
  targetSchedule: AcademicSchedulePeriod[],
): AcademicWeeklyPlanEntry[] {
  const topicBySubject = buildTopicBySubject(source);
  if (topicBySubject.size === 0) return [];

  const out: AcademicWeeklyPlanEntry[] = [];
  const seen = new Set<string>();

  for (const p of targetSchedule) {
    if (p.is_empty || !p.subject.trim()) continue;
    const subj = normalizeSubjectName(p.subject);
    const topic = topicBySubject.get(subj);
    if (!topic) continue;

    const slotKey = weeklyPlanEntryKey(p.day, p.period);
    if (seen.has(slotKey)) continue;
    seen.add(slotKey);

    out.push({
      day: p.day,
      period: p.period,
      subject: p.subject.trim(),
      lesson_topic: topic,
    });
  }

  return out;
}

export function countCopyableLessonSlots(
  source: AcademicWeeklyPlanEntry[],
  targetSchedule: AcademicSchedulePeriod[],
): number {
  return copyLessonTopicsToMatchingSlots(source, targetSchedule).length;
}

export function formatWeeklyPlanConflictMessage(conflicts: WeeklyPlanConflict[]): string {
  if (!conflicts.length) return '';
  const lines = conflicts.map(
    (c) => `${c.day} — الحصة ${c.period} (المعلم: ${c.teacherName})`,
  );
  return `تعارض: الحصة محجوزة لمعلم آخر:\n${lines.join('\n')}`;
}

export type TeacherPlanSectionGroup = {
  section: string;
  plans: AcademicWeeklyPlan[];
};

export type TeacherPlanGradeGroup = {
  level: AcademicEducationLevel;
  grade: number;
  sections: TeacherPlanSectionGroup[];
};

/** تجميع خطط المعلم حسب الصف ثم الفصل ثم الأسبوع */
export function groupTeacherWeeklyPlans(
  plans: AcademicWeeklyPlan[],
  teacherId: string,
): TeacherPlanGradeGroup[] {
  const mine = plans.filter(
    (p) =>
      p.teacher_id === teacherId
      || filterEntriesForTeacher(p.entries, teacherId, p.teacher_id).some((e) => e.lesson_topic?.trim()),
  );

  const byGrade = new Map<string, TeacherPlanGradeGroup>();

  for (const plan of mine) {
    const gradeKey = `${plan.education_level}_${plan.grade}`;
    if (!byGrade.has(gradeKey)) {
      byGrade.set(gradeKey, { level: plan.education_level, grade: plan.grade, sections: [] });
    }
    const gradeGroup = byGrade.get(gradeKey)!;
    let sectionGroup = gradeGroup.sections.find((s) => s.section === plan.section);
    if (!sectionGroup) {
      sectionGroup = { section: plan.section, plans: [] };
      gradeGroup.sections.push(sectionGroup);
    }
    sectionGroup.plans.push(plan);
  }

  for (const gradeGroup of byGrade.values()) {
    gradeGroup.sections.sort((a, b) => a.section.localeCompare(b.section, 'ar'));
    for (const sectionGroup of gradeGroup.sections) {
      sectionGroup.plans.sort(
        (a, b) =>
          (b.semester ?? 1) - (a.semester ?? 1)
          || b.week_number - a.week_number,
      );
    }
  }

  return [...byGrade.values()].sort((a, b) => {
    if (a.level !== b.level) return a.level === 'middle' ? -1 : 1;
    return a.grade - b.grade;
  });
}

/** حصص المعلم في خطة واحدة */
export function teacherFilledSlotCount(
  plan: AcademicWeeklyPlan,
  teacherId: string,
): number {
  return filterEntriesForTeacher(plan.entries, teacherId, plan.teacher_id).filter(
    (e) => e.lesson_topic?.trim(),
  ).length;
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
