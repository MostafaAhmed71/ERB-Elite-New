import { supabase } from '../supabase';
import type { AcademicHomework, AcademicEducationLevel } from './types';
import { academicNotificationService } from './academicNotificationService';
import { normalizeHomeworkPageNumbers } from './homeworkHelpers';

const TABLE = 'academic_homeworks';

function mapHomework(row: AcademicHomework): AcademicHomework {
  return {
    ...row,
    page_numbers: normalizeHomeworkPageNumbers(row),
  };
}

export const academicHomeworkService = {
  async listByTeacher(teacherId: string) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('teacher_id', teacherId).order('date', { ascending: false });
    if (error) throw error;
    return (data as AcademicHomework[]).map(mapHomework);
  },

  async listByLevel(level: AcademicEducationLevel) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('education_level', level).order('date', { ascending: false });
    if (error) throw error;
    return (data as AcademicHomework[]).map(mapHomework);
  },

  async listAll() {
    const { data, error } = await supabase.from(TABLE).select('*').order('date', { ascending: false });
    if (error) throw error;
    return (data as AcademicHomework[]).map(mapHomework);
  },

  async create(homework: Omit<AcademicHomework, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from(TABLE).insert(homework).select().single();
    if (error) throw error;
    const created = mapHomework(data as AcademicHomework);
    for (const section of created.sections) {
      try {
        await academicNotificationService.notifyHomeworkForSection({
          grade: created.grade,
          section,
          subject: created.subject,
          teacherName: created.teacher_name,
          date: created.date,
        });
      } catch {
        /* RPC may be unavailable until migration 057 */
      }
    }
    return created;
  },

  async update(id: string, updates: Partial<AcademicHomework>) {
    const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return mapHomework(data as AcademicHomework);
  },

  async delete(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
