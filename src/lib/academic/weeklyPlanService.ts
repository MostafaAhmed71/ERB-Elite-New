import { supabase } from '../supabase';
import type { AcademicWeeklyPlan, AcademicWeeklyPlanEntry, AcademicEducationLevel, AcademicSemester } from './types';
import { academicNotificationService } from './academicNotificationService';
import {
  getSupabaseErrorMessage,
  isMissingListMyPlansRpc,
  isMissingWeeklyPlanRpc,
  isUniqueClassWeekViolation,
} from './supabaseError';
import { maxWeeksForSemester, weeklyPlanEntryKey } from './constants';
import {
  filterEntriesForTeacher,
  normalizePlanEntries,
  sameTeacherId,
  teacherPlanHasContent,
} from './weeklyPlanHelpers';
import type { TeacherClassRef } from './teacherSetupHelpers';

const TABLE = 'academic_weekly_plans';

function entryOwnerId(entry: AcademicWeeklyPlanEntry, planOwnerId?: string): string | undefined {
  return entry.teacher_id ?? planOwnerId;
}

/** دمج حصص المعلم مع حصص معلمين آخرين — نفس منطق save_class_weekly_plan_slots */
function mergeWeeklyPlanEntries(
  existing: AcademicWeeklyPlanEntry[],
  incoming: AcademicWeeklyPlanEntry[],
  teacherId: string,
  teacherName: string,
  planOwnerId?: string,
): AcademicWeeklyPlanEntry[] {
  const keptOthers: AcademicWeeklyPlanEntry[] = [];
  const incomingKeys = new Set(
    incoming
      .filter((e) => e.lesson_topic?.trim())
      .map((e) => weeklyPlanEntryKey(e.day, e.period)),
  );

  for (const ex of existing) {
    const owner = entryOwnerId(ex, planOwnerId);
    if (owner === teacherId) continue;
    const key = weeklyPlanEntryKey(ex.day, ex.period);
    if (incomingKeys.has(key)) continue;
    if (!ex.lesson_topic?.trim()) continue;
    keptOthers.push(ex);
  }

  const mine = incoming
    .filter((e) => e.lesson_topic?.trim())
    .map((e) => ({
      day: e.day,
      period: e.period,
      subject: e.subject,
      lesson_topic: e.lesson_topic.trim(),
      teacher_id: teacherId,
      teacher_name: teacherName,
    }));

  return [...keptOthers, ...mine];
}

function countTeacherSlots(
  plan: AcademicWeeklyPlan,
  teacherId: string,
): number {
  return filterEntriesForTeacher(plan.entries, teacherId, plan.teacher_id).filter(
    (e) => e.lesson_topic?.trim(),
  ).length;
}

function normalizePlan(row: AcademicWeeklyPlan): AcademicWeeklyPlan {
  return {
    ...row,
    teacher_id: String(row.teacher_id),
    grade: Number(row.grade),
    week_number: Number(row.week_number),
    semester: Number(row.semester ?? 1) as AcademicSemester,
    entries: normalizePlanEntries(row.entries),
  };
}

async function listByTeacherFromTable(teacherId: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('updated_at', { ascending: false })
    .order('week_number', { ascending: false });
  if (error) throw error;
  return (data as AcademicWeeklyPlan[])
    .map(normalizePlan)
    .filter((p) => teacherPlanHasContent(p, teacherId));
}

export type ClassPlanKey = {
  education_level: AcademicEducationLevel;
  grade: number;
  section: string;
  semester: AcademicSemester;
  week_number: number;
};

function normalizeClassPlanKey(key: ClassPlanKey): ClassPlanKey {
  return {
    ...key,
    section: key.section.trim(),
    grade: Number(key.grade),
    week_number: Number(key.week_number),
    semester: Number(key.semester ?? 1) as AcademicSemester,
  };
}

async function findLatestClassPlan(key: ClassPlanKey) {
  const k = normalizeClassPlanKey(key);
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('education_level', k.education_level)
    .eq('grade', k.grade)
    .eq('semester', k.semester)
    .eq('week_number', k.week_number)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(getSupabaseErrorMessage(error));
  const match = (data as AcademicWeeklyPlan[] | null)?.find(
    (row) => String(row.section ?? '').trim() === k.section,
  );
  return match ? normalizePlan(match) : null;
}

export const academicWeeklyPlanService = {
  async listByTeacher(teacherId: string) {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('list_my_weekly_plans');
    if (!rpcErr && rpcData) {
      return (rpcData as AcademicWeeklyPlan[])
        .map(normalizePlan)
        .filter((p) => teacherPlanHasContent(p, teacherId));
    }
    if (rpcErr && !isMissingListMyPlansRpc(rpcErr)) {
      throw new Error(getSupabaseErrorMessage(rpcErr));
    }
    return listByTeacherFromTable(teacherId);
  },

  async listForTeacherClasses(teacherId: string, classes: TeacherClassRef[]) {
    if (!classes.length) return [];
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('week_number', { ascending: false })
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data as AcademicWeeklyPlan[]).map(normalizePlan).filter((p) =>
      classes.some(
        (c) =>
          c.level === p.education_level
          && c.grade === p.grade
          && c.section === p.section,
      ),
    );
  },

  async listByLevel(level: AcademicEducationLevel) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('education_level', level)
      .order('week_number', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as AcademicWeeklyPlan[]).map(normalizePlan);
  },

  async listAll() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('week_number', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as AcademicWeeklyPlan[]).map(normalizePlan);
  },

  async getClassPlan(key: ClassPlanKey) {
    return findLatestClassPlan(key);
  },

  async saveTeacherSlots(
    key: ClassPlanKey,
    entries: AcademicWeeklyPlan['entries'],
    teacherName: string,
  ) {
    const k = normalizeClassPlanKey(key);
    const semester = k.semester;
    const maxWeek = maxWeeksForSemester(semester);
    if (k.week_number < 1 || k.week_number > maxWeek) {
      throw new Error(`رقم الأسبوع يجب أن يكون من 1 إلى ${maxWeek} للفصل المختار`);
    }

    const sentCount = entries.filter((e) => e.lesson_topic?.trim()).length;
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user) throw new Error('يجب تسجيل الدخول');
    const uid = authData.user.id;

    const { data, error } = await supabase.rpc('save_class_weekly_plan_slots', {
      p_education_level: k.education_level,
      p_grade: k.grade,
      p_section: k.section,
      p_semester: semester,
      p_week_number: k.week_number,
      p_entries: entries,
    });

    if (error) {
      if (isMissingWeeklyPlanRpc(error) || isUniqueClassWeekViolation(error)) {
        return this.saveTeacherSlotsDirect(k, entries, teacherName, semester, uid);
      }
      const msg = getSupabaseErrorMessage(error);
      throw new Error(msg);
    }

    if (!data) {
      throw new Error('لم يُرجع الخادم بيانات الخطة — شغّل supabase/fix-weekly-plan-unique-save.sql في SQL Editor');
    }

    const saved = normalizePlan(data as AcademicWeeklyPlan);
    if (sentCount > 0 && countTeacherSlots(saved, uid) === 0) {
      throw new Error('لم تُحفظ الحصص — شغّل supabase/fix-weekly-plan-unique-save.sql في SQL Editor');
    }

    try {
      await academicNotificationService.notifyWeeklyPlan({
        grade: saved.grade,
        section: saved.section,
        semester: saved.semester ?? semester,
        weekNumber: saved.week_number,
        teacherName,
      });
    } catch {
      /* migration 057/058 */
    }
    return saved;
  },

  async saveTeacherSlotsDirect(
    key: ClassPlanKey,
    entries: AcademicWeeklyPlan['entries'],
    teacherName: string,
    semester: AcademicSemester,
    uid: string,
  ) {
    const k = normalizeClassPlanKey(key);
    const sentCount = entries.filter((e) => e.lesson_topic?.trim()).length;
    if (sentCount === 0) {
      throw new Error('أدخل موضوعاً لحصة واحدة على الأقل');
    }

    const existingPlan = await findLatestClassPlan({ ...k, semester });
    const persistMerged = async (current: AcademicWeeklyPlan | null) => {
      const mergedEntries = mergeWeeklyPlanEntries(
        current?.entries ?? [],
        entries,
        uid,
        teacherName,
        current?.teacher_id,
      );

      const payload = {
        teacher_id: current?.teacher_id ?? uid,
        teacher_name: teacherName,
        education_level: k.education_level,
        grade: k.grade,
        section: k.section,
        semester,
        week_number: k.week_number,
        entries: mergedEntries,
        updated_at: new Date().toISOString(),
      };

      if (current?.id) {
        const { data, error } = await supabase
          .from(TABLE)
          .update(payload)
          .eq('id', current.id)
          .select()
          .single();
        if (error) throw error;
        return normalizePlan(data as AcademicWeeklyPlan);
      }

      const { data, error } = await supabase
        .from(TABLE)
        .insert({ ...payload, teacher_id: uid })
        .select()
        .single();
      if (error) {
        if (isUniqueClassWeekViolation(error)) {
          const again = await findLatestClassPlan({ ...k, semester });
          if (again?.id) {
            return persistMerged(again);
          }
        }
        throw error;
      }
      return normalizePlan(data as AcademicWeeklyPlan);
    };

    let saved: AcademicWeeklyPlan;
    try {
      saved = await persistMerged(existingPlan);
    } catch (err) {
      throw new Error(getSupabaseErrorMessage(err));
    }
    if (countTeacherSlots(saved, uid) === 0) {
      throw new Error('لم تُحفظ الحصص — شغّل supabase/fix-weekly-plan-unique-save.sql في Supabase SQL Editor');
    }
    return saved;
  },

  /** @deprecated استخدم saveTeacherSlots — يبقى للتوافق */
  async create(plan: Omit<AcademicWeeklyPlan, 'id' | 'created_at' | 'updated_at'>) {
    return this.saveTeacherSlots(
      {
        education_level: plan.education_level,
        grade: plan.grade,
        section: plan.section,
        semester: (plan.semester ?? 1) as AcademicSemester,
        week_number: plan.week_number,
      },
      plan.entries,
      plan.teacher_name,
    );
  },

  /** @deprecated استخدم saveTeacherSlots */
  async update(id: string, updates: Partial<AcademicWeeklyPlan>, teacherName?: string) {
    const { data: existing, error: fetchErr } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr) throw new Error(getSupabaseErrorMessage(fetchErr));
    const plan = existing as AcademicWeeklyPlan;
    return this.saveTeacherSlots(
      {
        education_level: plan.education_level,
        grade: plan.grade,
        section: plan.section,
        semester: (plan.semester ?? 1) as AcademicSemester,
        week_number: plan.week_number,
      },
      updates.entries ?? plan.entries,
      teacherName ?? plan.teacher_name,
    );
  },

  async clearTeacherSlots(key: ClassPlanKey, teacherName: string) {
    return this.saveTeacherSlots(key, [], teacherName);
  },

  async delete(id: string) {
    const { error: rpcErr } = await supabase.rpc('delete_class_weekly_plan', { p_plan_id: id });
    if (!rpcErr) return;
    const rpcMsg = rpcErr.message ?? '';
    const rpcMissing =
      rpcErr.code === 'PGRST202'
      || rpcMsg.includes('schema cache')
      || rpcMsg.includes('Could not find');
    if (!rpcMissing) throw new Error(getSupabaseErrorMessage(rpcErr));

    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw new Error(getSupabaseErrorMessage(error));
  },

  /** حذف حصص المعلم أو الخطة كاملة إن لم يشاركها معلمون آخرون */
  async removeForTeacher(plan: AcademicWeeklyPlan, teacherId: string, teacherName: string) {
    const entries = normalizePlanEntries(plan.entries);
    const hasOtherTeachers = entries.some((e) => {
      if (!e.lesson_topic?.trim()) return false;
      return !sameTeacherId(entryOwnerId(e, plan.teacher_id), teacherId);
    });

    const key: ClassPlanKey = {
      education_level: plan.education_level,
      grade: plan.grade,
      section: plan.section,
      semester: (plan.semester ?? 1) as AcademicSemester,
      week_number: plan.week_number,
    };

    if (hasOtherTeachers) {
      await this.clearTeacherSlots(key, teacherName);
      return;
    }

    await this.delete(plan.id);
  },
};
