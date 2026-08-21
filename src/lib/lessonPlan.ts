import { supabase } from './supabase';

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    (error.message?.includes('schema cache') ?? false)
  );
}

export type LessonPlan = {
  id: string;
  teacher_user_id: string;
  grade: string;
  class_name: string;
  subject_name: string;
  lesson_title: string;
  lesson_date: string;
  linked_exam_id: string | null;
  notes: string | null;
  launched_at: string | null;
  created_at: string;
};

export type LessonPlanInput = {
  grade: string;
  class_name: string;
  subject_name: string;
  lesson_title: string;
  lesson_date: string;
  linked_exam_id?: string | null;
  notes?: string;
};

export async function fetchTeacherLessonPlans(userId: string): Promise<LessonPlan[]> {
  const { data, error } = await supabase
    .from('lesson_plans')
    .select('*')
    .eq('teacher_user_id', userId)
    .order('lesson_date', { ascending: false })
    .limit(30);
  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return (data ?? []) as LessonPlan[];
}

export async function saveLessonPlan(userId: string, input: LessonPlanInput): Promise<void> {
  const { error } = await supabase.from('lesson_plans').upsert(
    {
      teacher_user_id: userId,
      grade: input.grade,
      class_name: input.class_name,
      subject_name: input.subject_name,
      lesson_title: input.lesson_title,
      lesson_date: input.lesson_date,
      linked_exam_id: input.linked_exam_id ?? null,
      notes: input.notes ?? null,
    },
    { onConflict: 'teacher_user_id,grade,class_name,lesson_date,lesson_title' },
  );
  if (error) throw error;
}

export async function launchLessonPlan(planId: string): Promise<number> {
  const { data, error } = await supabase.rpc('launch_lesson_plan', { p_plan_id: planId });
  if (error) throw error;
  const result = data as { notified?: number };
  return result.notified ?? 0;
}

export async function deleteLessonPlan(planId: string): Promise<void> {
  const { error } = await supabase.from('lesson_plans').delete().eq('id', planId);
  if (error) throw error;
}
