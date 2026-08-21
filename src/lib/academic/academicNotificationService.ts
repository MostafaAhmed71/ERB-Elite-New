import { supabase } from '../supabase';

export const academicNotificationService = {
  async notifyHomeworkForSection(params: {
    grade: number;
    section: string;
    subject: string;
    teacherName: string;
    date: string;
  }) {
    const { data, error } = await supabase.rpc('academic_notify_homework_class', {
      p_grade: params.grade,
      p_section: params.section,
      p_subject: params.subject,
      p_teacher_name: params.teacherName,
      p_date: params.date,
    });
    if (error) throw error;
    return data as { notified?: number };
  },

  async notifyWeeklyPlan(params: {
    grade: number;
    section: string;
    semester: number;
    weekNumber: number;
    teacherName: string;
  }) {
    const { data, error } = await supabase.rpc('academic_notify_weekly_plan', {
      p_grade: params.grade,
      p_section: params.section,
      p_semester: params.semester,
      p_week_number: params.weekNumber,
      p_teacher_name: params.teacherName,
    });
    if (error) throw error;
    return data as { notified?: number };
  },
};
