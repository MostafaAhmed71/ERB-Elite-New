import { supabase } from './supabase';
import { getSkillsForSubject } from './subjectSkillsCatalog';

/** إنشاء مهارات تلقائياً عند إضافة مادة لصف */
export async function seedSkillsForSubject(
  grade: string,
  subjectName: string,
  userId: string
): Promise<number> {
  const templates = getSkillsForSubject(grade, subjectName);
  if (templates.length === 0) return 0;

  const rows = templates.map((t) => ({
    grade,
    subject_name: subjectName.trim(),
    skill_name: t.skill_name,
    description: t.description ?? null,
    created_by: userId,
  }));

  const { data: existing } = await supabase
    .from('skills')
    .select('skill_name')
    .eq('grade', grade)
    .eq('subject_name', subjectName.trim());

  const existingNames = new Set(
    ((existing ?? []) as { skill_name: string }[]).map((s) => s.skill_name)
  );
  const toInsert = rows.filter((r) => !existingNames.has(r.skill_name));

  if (toInsert.length === 0) return 0;

  const { error } = await supabase.from('skills').insert(toInsert);
  if (error) throw error;

  return toInsert.length;
}

/** حذف مهارات مرتبطة بمادة وصف */
export async function deleteSkillsForSubject(
  grade: string,
  subjectName: string
): Promise<void> {
  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('grade', grade)
    .eq('subject_name', subjectName);
  if (error) throw error;
}
