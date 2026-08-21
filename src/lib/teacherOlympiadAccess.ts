import { supabase } from './supabase';
import { normalizeGradeLabel } from './academic/gradeBridge';
import type { AcademicEducationLevel } from './academic/types';

export function gradeLabelIsMiddle(grade: string): boolean {
  return normalizeGradeLabel(grade).includes('متوسط');
}

export function gradeLabelIsHigh(grade: string): boolean {
  return normalizeGradeLabel(grade).includes('ثانوي');
}

/**
 * الأولمبياد للمرحلة المتوسطة فقط.
 * يُمنع إن كان المعلم يدرّس الثانوية فقط (بدون أي صف متوسط).
 */
export async function fetchTeacherCanAccessOlympiad(
  userId: string,
  staffEducationLevel?: AcademicEducationLevel | null,
): Promise<boolean> {
  let hasMiddle = staffEducationLevel === 'middle';
  let hasHigh = staffEducationLevel === 'high';

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (teacher?.id) {
    const { data: classes } = await supabase
      .from('teacher_classes')
      .select('grade')
      .eq('teacher_id', teacher.id);
    for (const row of classes ?? []) {
      if (gradeLabelIsMiddle(row.grade)) hasMiddle = true;
      if (gradeLabelIsHigh(row.grade)) hasHigh = true;
    }
  }

  const [{ data: assignments }, { data: setup }] = await Promise.all([
    supabase
      .from('academic_teacher_assignments')
      .select('education_level')
      .eq('teacher_id', userId),
    supabase
      .from('academic_teacher_setups')
      .select('education_levels')
      .eq('teacher_id', userId)
      .maybeSingle(),
  ]);

  for (const row of assignments ?? []) {
    if (row.education_level === 'middle') hasMiddle = true;
    if (row.education_level === 'high') hasHigh = true;
  }

  const setupLevels = (setup as { education_levels?: AcademicEducationLevel[] } | null)?.education_levels;
  for (const level of setupLevels ?? []) {
    if (level === 'middle') hasMiddle = true;
    if (level === 'high') hasHigh = true;
  }

  if (hasMiddle) return true;
  if (hasHigh) return false;
  // لا بيانات واضحة: إن وُسم الملف ثانويًا يُمنع، وإلا يُسمح (توافق معلمي المتوسط)
  return staffEducationLevel !== 'high';
}
