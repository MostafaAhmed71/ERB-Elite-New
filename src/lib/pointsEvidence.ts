import { uploadPointsEvidenceToHostinger } from './hostingerUpload';

/** نشاط ثابت في الكتالوج للمنح اليدوي من المعلم */
export const MANUAL_TEACHER_ACTIVITY_ID = 'e1111111-1111-4111-8111-111111111101';

export function buildManualActivityNote(activityName: string, extraNote?: string): string {
  const title = activityName.trim();
  const extra = (extraNote ?? '').trim();
  if (extra) return `نشاط يدوي: ${title} — ${extra}`;
  return `نشاط يدوي: ${title}`;
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
