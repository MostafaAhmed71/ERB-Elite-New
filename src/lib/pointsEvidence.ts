import { uploadPointsEvidenceToHostinger } from './hostingerUpload';
import { supabase } from './supabase';

/** نشاط ثابت في الكتالوج للمنح اليدوي من المعلم */
export const MANUAL_TEACHER_ACTIVITY_ID = 'e1111111-1111-4111-8111-111111111101';

export function buildManualActivityNote(activityName: string, extraNote?: string): string {
  const title = activityName.trim();
  const extra = (extraNote ?? '').trim();
  if (extra) return `نشاط يدوي: ${title} — ${extra}`;
  return `نشاط يدوي: ${title}`;
}

/**
 * يضمن وجود صف «نشاط يدوي» في الكتالوج قبل الإدراج في points_ledger.
 * يستخدم RPC (SECURITY DEFINER) ثم upsert كاحتياط.
 */
export async function ensureManualTeacherActivity(): Promise<string> {
  const { error: rpcError } = await supabase.rpc('ensure_manual_teacher_activity');
  if (!rpcError) return MANUAL_TEACHER_ACTIVITY_ID;

  const { error: upsertError } = await supabase.from('activities').upsert(
    {
      id: MANUAL_TEACHER_ACTIVITY_ID,
      name: 'نشاط يدوي',
      category: 'activity',
      default_points: 10,
      is_active: true,
    },
    { onConflict: 'id' },
  );

  if (upsertError) {
    const { data, error: readError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', MANUAL_TEACHER_ACTIVITY_ID)
      .maybeSingle();

    if (data?.id) return MANUAL_TEACHER_ACTIVITY_ID;

    throw new Error(
      readError?.message ||
        upsertError.message ||
        rpcError.message ||
        'نشاط المنح اليدوي غير موجود في الكتالوج — شغّل supabase/fix-ensure-manual-teacher-activity.sql',
    );
  }

  return MANUAL_TEACHER_ACTIVITY_ID;
}

/**
 * رفع شواهد اختيارية إلى Hostinger (مثل مراجعات PDF).
 * يُحفظ الرابط العام فقط في points_ledger.evidence_urls على Supabase.
 */
export async function uploadPointsEvidenceFiles(
  userId: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) return [];

  const urls: string[] = [];
  for (const file of files) {
    const uploaded = await uploadPointsEvidenceToHostinger(file, userId);
    urls.push(uploaded.url);
  }
  return urls;
}
