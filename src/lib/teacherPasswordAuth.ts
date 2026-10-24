import { supabase } from './supabase';

type TeacherPasswordResponse = {
  state?: 'setup' | 'password';
  code?: string;
  expires_at?: string;
  session?: { access_token: string; refresh_token: string };
};
async function callTeacherPasswordAuth(body: Record<string, unknown>): Promise<TeacherPasswordResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const { data } = await supabase.auth.getSession();
    const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!baseUrl || !anonKey) throw new Error('إعدادات الاتصال غير مكتملة');
    const res = await fetch(`${baseUrl}/functions/v1/teacher-password-auth`, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${data.session?.access_token ?? anonKey}` },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (payload.error) throw new Error(payload.error);
    if (!res.ok) throw new Error('خدمة تسجيل الدخول غير متاحة؛ تواصل مع إدارة المدرسة');
    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw Object.assign(new Error('انتهت مهلة الاتصال؛ حاول مجدداً'), { cause: error });
    throw error;
  } finally { clearTimeout(timeout); }
}
export async function checkTeacherPassword(phone: string): Promise<'setup' | 'password'> {
  const response = await callTeacherPasswordAuth({ action: 'check', phone });
  if (response.state !== 'setup' && response.state !== 'password') throw new Error('تعذر التحقق من حساب المعلم');
  return response.state;
}
export async function setupTeacherPassword(phone: string, code: string, password: string): Promise<void> {
  await callTeacherPasswordAuth({ action: 'setup', phone, code, password });
}
export async function loginTeacherPassword(phone: string, password: string): Promise<void> {
  const { session } = await callTeacherPasswordAuth({ action: 'login', phone, password });
  if (!session?.access_token || !session.refresh_token) throw new Error('تعذر إنشاء جلسة الدخول');
  const { error } = await supabase.auth.setSession(session);
  if (error) throw error;
}
export async function issueTeacherPasswordCode(userId: string): Promise<{ code: string; expires_at: string }> {
  const response = await callTeacherPasswordAuth({ action: 'issue_code', user_id: userId });
  if (!response.code || !response.expires_at) throw new Error('تعذر إصدار كود التفعيل');
  return { code: response.code, expires_at: response.expires_at };
}
