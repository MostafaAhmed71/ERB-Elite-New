import { supabase } from './supabase';
import { logAction } from './auth';
import { extractErrorMessage } from './errors';

export interface StudentRosterInput {
  full_name: string;
  national_id: string;
  grade: string;
  class_name: string;
  phone?: string | null;
}

/** إضافة/تحديث سجل طالب في القائمة المدرسية بدون إنشاء حساب دخول */
export async function upsertStudentRosterRecord(input: StudentRosterInput): Promise<string> {
  const nationalId = input.national_id.trim();
  const fullName = input.full_name.trim();
  const grade = input.grade.trim();
  const className = input.class_name.trim();
  const phone = input.phone?.trim() || null;

  if (!nationalId) throw new Error('رقم الهوية مطلوب');
  if (!fullName) throw new Error('الاسم الكامل مطلوب');
  if (!grade) throw new Error('الصف مطلوب');
  if (!className) throw new Error('الفصل مطلوب');

  const { data, error } = await supabase
    .from('students')
    .upsert(
      {
        admission_number: nationalId,
        national_id: nationalId,
        full_name: fullName,
        grade,
        class_name: className,
        phone,
        academic_year: new Date().getFullYear().toString(),
        is_active: true,
      },
      { onConflict: 'admission_number' }
    )
    .select('id')
    .maybeSingle();

  if (error) throw new Error(extractErrorMessage(error));

  const id = data?.id;
  await logAction('STUDENT_ROSTER_UPSERT', 'students', id, {
    national_id: nationalId,
    full_name: fullName,
  });

  return id ?? '';
}
