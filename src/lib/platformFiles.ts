import { supabase } from './supabase';

export type StorageBucketInfo = {
  id: string;
  name: string;
  public: boolean;
  file_size_limit: number | null;
  object_count: number;
};

export type StorageObjectRow = {
  name: string;
  created_at: string | null;
  updated_at: string | null;
  metadata: Record<string, unknown> | null;
};

export type PlatformFileIndexRow = {
  id: string;
  bucket_id: string;
  object_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  source_module: string | null;
  public_url: string | null;
  uploaded_by: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export const KNOWN_BUCKET_LABELS: Record<string, string> = {
  'school-media': 'وسائط المدرسة (صور)',
  'question-audio': 'صوت أسئلة المسابقة',
  'exam-review-files': 'ملفات مراجعات الاختبارات',
  'ai-knowledge': 'معرفة المساعد الذكي (RAG)',
};

export function formatBytes(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export async function listKnownStorageBuckets(): Promise<StorageBucketInfo[]> {
  const { data, error } = await supabase.rpc('list_known_storage_buckets');
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name),
    public: !!row.public,
    file_size_limit: row.file_size_limit != null ? Number(row.file_size_limit) : null,
    object_count: Number(row.object_count ?? 0),
  }));
}

export async function listStorageObjectsReadonly(
  bucket: string,
  limit = 50,
): Promise<StorageObjectRow[]> {
  const { data, error } = await supabase.rpc('list_storage_objects_readonly', {
    p_bucket: bucket,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as StorageObjectRow[];
}

export async function listPlatformFileIndex(opts?: {
  bucket?: string;
  limit?: number;
}): Promise<PlatformFileIndexRow[]> {
  let q = supabase
    .from('platform_file_index')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 50);
  if (opts?.bucket) q = q.eq('bucket_id', opts.bucket);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PlatformFileIndexRow[];
}

export async function registerPlatformFile(input: {
  bucket: string;
  path: string;
  fileName?: string;
  mime?: string;
  size?: number;
  module?: string;
  publicUrl?: string;
  meta?: Record<string, unknown>;
}): Promise<string> {
  const { data, error } = await supabase.rpc('register_platform_file', {
    p_bucket: input.bucket,
    p_path: input.path,
    p_file_name: input.fileName ?? null,
    p_mime: input.mime ?? null,
    p_size: input.size ?? null,
    p_module: input.module ?? null,
    p_public_url: input.publicUrl ?? null,
    p_meta: input.meta ?? {},
  });
  if (error) throw error;
  return data as string;
}
