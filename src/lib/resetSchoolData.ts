import { supabase } from './supabase';
import { extractErrorMessage } from './errors';

export async function resetSchoolData(confirmText: string): Promise<{
  ok: boolean;
  truncated_attempts: number;
  deleted_users: number;
}> {
  const { data, error } = await supabase.rpc('reset_school_data', {
    p_confirm: confirmText.trim(),
  });
  if (error) throw new Error(extractErrorMessage(error));
  const row = data as {
    ok?: boolean;
    truncated_attempts?: number;
    deleted_users?: number;
  };
  if (!row?.ok) throw new Error('فشل تصفير قاعدة البيانات');
  return {
    ok: true,
    truncated_attempts: Number(row.truncated_attempts ?? 0),
    deleted_users: Number(row.deleted_users ?? 0),
  };
}
