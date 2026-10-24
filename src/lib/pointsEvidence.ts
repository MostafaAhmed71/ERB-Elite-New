import { uploadPointsEvidenceToHostinger } from './hostingerUpload';
import { supabase } from './supabase';

/** نشاط ثابت في الكتالوج للمنح اليدوي من المعلم */
export const MANUAL_TEACHER_ACTIVITY_ID = 'e1111111-1111-4111-8111-111111111101';
/** نشاط ثابت في الكتالوج للمنح اليدوي في محور السلوك */
export const MANUAL_BEHAVIOR_ACTIVITY_ID = 'e1111111-1111-4111-8111-111111111102';

export const MANUAL_ACTIVITY_IDS: readonly string[] = [
  MANUAL_TEACHER_ACTIVITY_ID,
  MANUAL_BEHAVIOR_ACTIVITY_ID,
];

export type ManualActivityKind = 'activity' | 'behavior';

const MANUAL_ACTIVITY_META: Record<
  ManualActivityKind,
  { id: string; name: string; rpc: string; notePrefix: string; sqlHint: string }
> = {
  activity: {
    id: MANUAL_TEACHER_ACTIVITY_ID,
    name: 'نشاط يدوي',
    rpc: 'ensure_manual_teacher_activity',
    notePrefix: 'نشاط يدوي',
    sqlHint: 'supabase/fix-ensure-manual-teacher-activity.sql',
  },
  behavior: {
    id: MANUAL_BEHAVIOR_ACTIVITY_ID,
    name: 'سلوك يدوي',
    rpc: 'ensure_manual_behavior_activity',
    notePrefix: 'سلوك يدوي',
    sqlHint: 'supabase/migrations/144_manual_behavior_activity.sql',
  },
};

export function isManualActivityId(id: string | null | undefined): boolean {
  return !!id && MANUAL_ACTIVITY_IDS.includes(id);
}

export function buildManualActivityNote(
  activityName: string,
  extraNote?: string,
  kind: ManualActivityKind = 'activity',
): string {
  const prefix = MANUAL_ACTIVITY_META[kind].notePrefix;
  const title = activityName.trim();
  const extra = (extraNote ?? '').trim();
  if (extra) return `${prefix}: ${title} — ${extra}`;
  return `${prefix}: ${title}`;
}

/**
 * يضمن وجود صف النشاط اليدوي (نشاطي أو سلوكي) في الكتالوج قبل الإدراج في points_ledger.
 * يستخدم RPC (SECURITY DEFINER) ثم upsert كاحتياط.
 */
export async function ensureManualActivity(kind: ManualActivityKind = 'activity'): Promise<string> {
  const meta = MANUAL_ACTIVITY_META[kind];
  const { error: rpcError } = await supabase.rpc(meta.rpc);
  if (!rpcError) return meta.id;

  const { error: upsertError } = await supabase.from('activities').upsert(
    {
      id: meta.id,
      name: meta.name,
      category: kind,
      default_points: 10,
      is_active: true,
    },
    { onConflict: 'id' },
  );

  if (upsertError) {
    const { data, error: readError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', meta.id)
      .maybeSingle();

    if (data?.id) return meta.id;

    throw new Error(
      readError?.message ||
        upsertError.message ||
        rpcError.message ||
        `نشاط «${meta.name}» غير موجود في الكتالوج — شغّل ${meta.sqlHint}`,
    );
  }

  return meta.id;
}

export function ensureManualTeacherActivity(): Promise<string> {
  return ensureManualActivity('activity');
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
