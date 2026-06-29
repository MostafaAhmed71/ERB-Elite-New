import { supabase } from './supabase';

const BUCKET = 'school-media';
const MAX_BYTES = 3 * 1024 * 1024;

function resolveImageExt(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
}

function assertImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('يرجى اختيار ملف صورة (JPG أو PNG أو WebP)');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('حجم الصورة يجب ألا يتجاوز 3 ميجابايت');
  }
}

function withCacheBust(publicUrl: string) {
  return `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
}

export async function uploadStudentPhoto(studentId: string, file: File): Promise<string> {
  assertImageFile(file);
  const ext = resolveImageExt(file);
  const path = `students/${studentId}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
    contentType: file.type || `image/${ext}`,
  });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = withCacheBust(publicUrl);

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

export async function uploadClassPhoto(grade: string, className: string, file: File): Promise<string> {
  assertImageFile(file);
  const ext = resolveImageExt(file);
  const path = `classes/${encodeURIComponent(grade)}/${encodeURIComponent(className)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
    contentType: file.type || `image/${ext}`,
  });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = withCacheBust(publicUrl);

  const { error } = await supabase.from('class_profiles').upsert(
    {
      grade,
      class_name: className,
      photo_url: url,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'grade,class_name' }
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
