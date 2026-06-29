import { supabase } from './supabase';

export async function createStaffInvite(email: string, role: 'admin' | 'supervisor' | 'teacher') {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error('يجب تسجيل الدخول');

  const { data, error } = await supabase.functions.invoke('create-staff-invite', {
    body: { email, role },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { token: string; expires_at: string };
}

export async function acceptStaffInvite(params: {
  token: string;
  email: string;
  password: string;
  full_name: string;
}) {
  const { data, error } = await supabase.functions.invoke('accept-staff-invite', {
    body: params,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { user_id: string; role: string };
}

export function buildInviteLink(token: string) {
  const base = window.location.origin;
  return `${base}/invite/${token}`;
}
