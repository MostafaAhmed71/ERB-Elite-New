import { supabase } from './supabase';
import { extractErrorMessage } from './errors';

export type ManagedCredential = {
  id: string;
  user_id: string;
  admission_number: string;
  account_type: 'student' | 'parent';
  student_name: string;
  grade: string | null;
  class_name: string | null;
  email: string;
  display_password: string;
  password_changed_by_user: boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchManagedCredentials(): Promise<ManagedCredential[]> {
  const { data, error } = await supabase
    .from('managed_account_credentials')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    if (/managed_account_credentials|does not exist|42P01/i.test(error.message)) {
      throw new Error(
        'جدول الحسابات غير موجود — شغّل supabase/migrations/036_managed_account_credentials.sql في SQL Editor'
      );
    }
    throw error;
  }

  return (data ?? []) as ManagedCredential[];
}

export async function adminUpdateUserCredentials(params: {
  user_id: string;
  email?: string;
  password?: string;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-update-user', {
    body: params,
  });

  if (data?.error) throw new Error(extractErrorMessage(data.error));
  if (error) {
    const msg = extractErrorMessage(error.message);
    throw new Error(
      /failed to fetch|function not found|404/i.test(msg)
        ? 'يجب نشر دالة admin-update-user: npx supabase functions deploy admin-update-user'
        : msg
    );
  }
}

export async function syncManagedCredentialPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.rpc('sync_managed_credential_password', {
    p_password: newPassword,
  });
  if (error) {
    console.warn('sync_managed_credential_password:', error.message);
  }
}
