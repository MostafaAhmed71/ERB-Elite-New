import { supabase } from '../supabase';
import type {
  AcademicTeacherSchedule,
  AcademicLessonTopics,
  AcademicTeacherSetup,
} from './types';
import { syncTeacherOlympiadFromAcademic } from './olympiadSyncService';
import { classesMatch } from './gradeBridge';

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
    const persist = async (payload: typeof rest) => {
      if (id) {
        const { data, error } = await supabase.from('academic_teacher_setups').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return data as AcademicTeacherSetup;
      }
      const { data, error } = await supabase.from('academic_teacher_setups').upsert(payload, { onConflict: 'teacher_id' }).select().single();
      if (error) throw error;
      return data as AcademicTeacherSetup;
    };

    let saved: AcademicTeacherSetup;
    try {
      saved = await persist(rest);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes('subjects_by_grade')) throw err;
      const { subjects_by_grade: _ignored, ...legacy } = rest;
      saved = await persist(legacy);
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

    const { data: classRows, error: lookupError } = await supabase
      .from('academic_teacher_schedules')
      .select('id, section')
      .eq('teacher_id', rest.teacher_id)
      .eq('education_level', rest.education_level)
      .eq('grade', rest.grade);
    if (lookupError) throw lookupError;

    const existingId = (classRows ?? []).find((row) => classesMatch(row.section, rest.section))?.id;
    const targetId = existingId ?? id ?? null;

    if (targetId) {
      const { data, error } = await supabase
        .from('academic_teacher_schedules')
        .update(rest)
        .eq('id', targetId)
        .select()
        .single();
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
