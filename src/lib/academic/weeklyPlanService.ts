import { supabase } from '../supabase';
import type { AcademicWeeklyPlan, AcademicEducationLevel, AcademicSemester } from './types';
import { academicNotificationService } from './academicNotificationService';
import { getSupabaseErrorMessage } from './supabaseError';
import { maxWeeksForSemester } from './constants';
import type { TeacherClassRef } from './teacherSetupHelpers';

const TABLE = 'academic_weekly_plans';

function normalizePlan(row: AcademicWeeklyPlan): AcademicWeeklyPlan {
  return { ...row, semester: (row.semester ?? 1) as AcademicSemester };
}

function isSemesterColumnError(err: unknown): boolean {
  const msg = (err as { message?: string })?.message ?? '';
  return (
    msg.includes('semester') &&
    (msg.includes('schema cache') || msg.includes('column') || msg.includes('Could not find'))
  );
}

export type ClassPlanKey = {
  education_level: AcademicEducationLevel;
  grade: number;
  section: string;
  semester: AcademicSemester;
  week_number: number;
};

export const academicWeeklyPlanService = {
  async listByTeacher(teacherId: string) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('week_number', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    const plans = (data as AcademicWeeklyPlan[]).map(normalizePlan);
    return plans.filter(
      (p) =>
        p.teacher_id === teacherId
        || p.entries.some((e) => e.teacher_id === teacherId),
    );
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
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('education_level', key.education_level)
      .eq('grade', key.grade)
      .eq('section', key.section)
      .eq('semester', key.semester)
      .eq('week_number', key.week_number)
      .maybeSingle();
    if (error) throw error;
    return data ? normalizePlan(data as AcademicWeeklyPlan) : null;
  },

  async saveTeacherSlots(
    key: ClassPlanKey,
    entries: AcademicWeeklyPlan['entries'],
    teacherName: string,
  ) {
    const semester = (key.semester ?? 1) as AcademicSemester;
    const maxWeek = maxWeeksForSemester(semester);
    if (key.week_number < 1 || key.week_number > maxWeek) {
      throw new Error(`رقم الأسبوع يجب أن يكون من 1 إلى ${maxWeek} للفصل المختار`);
    }

    const { data, error } = await supabase.rpc('save_class_weekly_plan_slots', {
      p_education_level: key.education_level,
      p_grade: key.grade,
      p_section: key.section,
      p_semester: semester,
      p_week_number: key.week_number,
      p_entries: entries,
    });

    if (error) {
      const msg = getSupabaseErrorMessage(error);
      if (msg.includes('تعارض') || msg.includes('محجوزة')) {
        throw new Error(msg);
      }
      throw new Error(msg);
    }

    const saved = normalizePlan(data as AcademicWeeklyPlan);
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
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw new Error(getSupabaseErrorMessage(error));
  },
};
