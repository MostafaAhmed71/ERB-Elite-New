import { supabase } from '../supabase';
import type {
  AcademicTeacherSchedule,
  AcademicLessonTopics,
  AcademicTeacherSetup,
} from './types';
import { syncTeacherOlympiadFromAcademic } from './olympiadSyncService';

export type AcademicScheduleWithTeacher = AcademicTeacherSchedule & {
  teacher: { full_name: string } | null;
};

export const academicTeacherService = {
  async getSetup(teacherId: string) {
    const { data, error } = await supabase
      .from('academic_teacher_setups')
      .select('*')
      .eq('teacher_id', teacherId)
      .maybeSingle();
    if (error) throw error;
    return data as AcademicTeacherSetup | null;
  },

  async saveSetup(setup: Omit<AcademicTeacherSetup, 'id'> & { id?: string }) {
    const { id, ...rest } = setup;
    let saved: AcademicTeacherSetup;
    if (id) {
      const { data, error } = await supabase.from('academic_teacher_setups').update(rest).eq('id', id).select().single();
      if (error) throw error;
      saved = data as AcademicTeacherSetup;
    } else {
      const { data, error } = await supabase.from('academic_teacher_setups').upsert(rest, { onConflict: 'teacher_id' }).select().single();
      if (error) throw error;
      saved = data as AcademicTeacherSetup;
    }

    if (saved.is_setup_complete) {
      try {
        await syncTeacherOlympiadFromAcademic(saved.teacher_id);
      } catch (syncErr) {
        console.warn('Olympiad sync after teacher setup:', syncErr);
      }
    }

    return saved;
  },

  async listSchedules(teacherId: string) {
    const { data, error } = await supabase.from('academic_teacher_schedules').select('*').eq('teacher_id', teacherId).order('grade');
    if (error) throw error;
    return data as AcademicTeacherSchedule[];
  },

  /**
   * كل جداول المعلمين مع أسمائهم — لعرض المعلم المسؤول عن كل حصة.
   * متاح للوكيل/المدير فقط حسب سياسات RLS.
   */
  async listAllSchedulesWithTeacher() {
    const { data, error } = await supabase
      .from('academic_teacher_schedules')
      .select('*, teacher:teacher_id(full_name)');
    if (error) throw error;
    return (data ?? []) as AcademicScheduleWithTeacher[];
  },

  async saveSchedule(schedule: Omit<AcademicTeacherSchedule, 'id'> & { id?: string }) {
    const { id, ...rest } = schedule;
    if (id) {
      const { data, error } = await supabase.from('academic_teacher_schedules').update(rest).eq('id', id).select().single();
      if (error) throw error;
      return data as AcademicTeacherSchedule;
    }
    const { data, error } = await supabase.from('academic_teacher_schedules').insert(rest).select().single();
    if (error) throw error;
    return data as AcademicTeacherSchedule;
  },

  async deleteSchedule(id: string) {
    const { error } = await supabase.from('academic_teacher_schedules').delete().eq('id', id);
    if (error) throw error;
  },

  async listLessonTopics(teacherId: string) {
    const { data, error } = await supabase.from('academic_lesson_topics').select('*').eq('teacher_id', teacherId).order('subject');
    if (error) throw error;
    return data as AcademicLessonTopics[];
  },

  async saveLessonTopics(topics: Omit<AcademicLessonTopics, 'id'> & { id?: string }) {
    const { id, ...rest } = topics;
    if (id) {
      const { data, error } = await supabase.from('academic_lesson_topics').update(rest).eq('id', id).select().single();
      if (error) throw error;
      return data as AcademicLessonTopics;
    }
    const { data, error } = await supabase.from('academic_lesson_topics').insert(rest).select().single();
    if (error) throw error;
    return data as AcademicLessonTopics;
  },

  async deleteLessonTopics(id: string) {
    const { error } = await supabase.from('academic_lesson_topics').delete().eq('id', id);
    if (error) throw error;
  },
};
