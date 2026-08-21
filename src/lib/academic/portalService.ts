import { supabase } from '../supabase';
import type { AcademicHomework, AcademicWeeklyPlan } from './types';
import { normalizeHomeworkPageNumbers } from './homeworkHelpers';

function mapHomework(row: AcademicHomework): AcademicHomework {
  return { ...row, page_numbers: normalizeHomeworkPageNumbers(row) };
}

function mapPlan(row: AcademicWeeklyPlan): AcademicWeeklyPlan {
  return { ...row, semester: (row.semester ?? 1) as AcademicWeeklyPlan['semester'] };
}

export const academicPortalService = {
  async listHomeworks(opts?: { studentId?: string; days?: number }) {
    const { data, error } = await supabase.rpc('portal_list_homeworks', {
      p_student_id: opts?.studentId ?? null,
      p_days: opts?.days ?? 14,
    });
    if (error) throw error;
    return ((data ?? []) as AcademicHomework[]).map(mapHomework);
  },

  async listWeeklyPlans(opts?: { studentId?: string; semester?: number; weekNumber?: number }) {
    const { data, error } = await supabase.rpc('portal_list_weekly_plans', {
      p_student_id: opts?.studentId ?? null,
      p_semester: opts?.semester ?? null,
      p_week_number: opts?.weekNumber ?? null,
    });
    if (error) throw error;
    return ((data ?? []) as AcademicWeeklyPlan[]).map(mapPlan);
  },

  async deputyExamSummary() {
    const { data, error } = await supabase.rpc('deputy_level_exam_summary');
    if (error) throw error;
    return (data ?? []) as {
      grade: string;
      class_name: string;
      student_count: number;
      exams_taken: number;
      avg_pct: number | null;
    }[];
  },
};
