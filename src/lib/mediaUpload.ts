import { supabase } from './supabase';
import { uploadSchoolMediaToHostinger } from './hostingerUpload';

const MAX_BYTES = 3 * 1024 * 1024;

function assertImageFile(file: File) {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
    throw new Error('يرجى اختيار ملف صورة (JPG أو PNG أو WebP)');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('حجم الصورة يجب ألا يتجاوز 3 ميجابايت');
  }
}

function withCacheBust(publicUrl: string) {
  return `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
}

/** مفتاح ASCII ثابت لاسم الملف على Hostinger */
function classMediaKey(grade: string, className: string): string {
  const raw = `${grade.trim()}__${className.trim()}`;
  const bytes = new TextEncoder().encode(raw);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * رفع صورة طالب → Hostinger، ثم حفظ الرابط في Supabase فقط.
 */
export async function uploadStudentPhoto(studentId: string, file: File): Promise<string> {
  assertImageFile(file);
  const safeId = studentId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId) throw new Error('معرّف الطالب غير صالح');

  const uploaded = await uploadSchoolMediaToHostinger(file, 'student', safeId);
  const url = withCacheBust(uploaded.url);

  const { error: studentError } = await supabase
    .from('students')
    .update({ photo_url: url })
    .eq('id', studentId);
  if (studentError) throw studentError;

  const { data: student } = await supabase
    .from('students')
    .select('user_id')
    .eq('id', studentId)
    .maybeSingle();

  if (student?.user_id) {
    await supabase.from('users').update({ avatar_url: url }).eq('id', student.user_id);
  }

  return url;
}

/**
 * رفع صورة فصل → Hostinger، ثم حفظ الرابط في class_profiles (Supabase).
 */
export async function uploadClassPhoto(grade: string, className: string, file: File): Promise<string> {
  assertImageFile(file);
  const key = classMediaKey(grade, className);
  const uploaded = await uploadSchoolMediaToHostinger(file, 'class', key);
  const url = withCacheBust(uploaded.url);

  const { error } = await supabase.from('class_profiles').upsert(
    {
      grade,
      class_name: className,
      photo_url: url,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'grade,class_name' },
  );
  if (error) throw error;

  return url;
}

export type ClassProfileRow = {
  id: string;
  grade: string;
  class_name: string;
  photo_url: string | null;
};

export async function fetchClassProfiles(): Promise<ClassProfileRow[]> {
  const { data, error } = await supabase.from('class_profiles').select('id, grade, class_name, photo_url');
  if (error) throw error;
  return (data ?? []) as ClassProfileRow[];
}

export function classProfileKey(grade: string, className: string) {
  return `${grade}__${className}`;
}
