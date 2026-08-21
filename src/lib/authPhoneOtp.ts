import { supabase } from './supabase';

export function normalizePhoneDigits(phone: string): string {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('05')) p = '966' + p.slice(1);
  else if (p.startsWith('5') && p.length === 9) p = '966' + p;
  else if (p.startsWith('0') && p.length === 10) p = '966' + p.slice(1);
  return p;
}

type OtpAction =
  | 'request_login'
  | 'verify_login'
  | 'request_reset'
  | 'verify_reset'
  | 'request_signup'
  | 'verify_signup';

type OtpResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  token_hash?: string;
  email?: string;
  type?: string;
};

/**
 * استدعاء مباشر لـ Edge Function — أوضح من functions.invoke عند عدم النشر / فشل البوابة.
 */
async function callAuthPhoneOtp(body: Record<string, unknown>): Promise<OtpResponse> {
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!baseUrl || !anonKey) {
    throw new Error('إعدادات Supabase غير مكتملة في الواجهة');
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/functions/v1/auth-phone-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      'تعذّر الاتصال بخادم Supabase. تحقق من الإنترنت، ثم انشر الدالة: supabase functions deploy auth-phone-otp',
    );
  }

  const payload = (await res.json().catch(() => ({}))) as OtpResponse;

  // أي رد JSON فيه error من الدالة — اعرضه (حتى لو كان HTTP 404 لـ «غير مسجّل»)
  if (payload.error) {
    throw new Error(payload.error);
  }

  // 404 بدون جسم من الدالة = غالباً الدالة غير موجودة على البوابة
  if (res.status === 404) {
    throw new Error(
      'دالة auth-phone-otp غير منشورة على Supabase. نفّذ: supabase functions deploy auth-phone-otp',
    );
  }

  if (!res.ok) {
    throw new Error(`خطأ من خادم التحقق (HTTP ${res.status})`);
  }

  return payload;
}

export async function requestTeacherLoginOtp(phone: string): Promise<string> {
  const res = await callAuthPhoneOtp({
    action: 'request_login' as OtpAction,
    phone: phone.trim(),
  });
  return res.message || 'تم إرسال رمز التحقق إلى واتسابك.';
}

export async function verifyTeacherLoginOtp(phone: string, code: string): Promise<void> {
  const res = await callAuthPhoneOtp({
    action: 'verify_login' as OtpAction,
    phone: phone.trim(),
    code: code.trim(),
  });

  if (!res.token_hash) {
    throw new Error('تعذر إكمال تسجيل الدخول');
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: res.token_hash,
    type: 'email',
  });

  if (error) {
    throw new Error(error.message || 'فشل إنشاء الجلسة');
  }
}

export async function requestPasswordResetOtp(phone: string): Promise<string> {
  const res = await callAuthPhoneOtp({
    action: 'request_reset' as OtpAction,
    phone: phone.trim(),
  });
  return (
    res.message ||
    'إن وُجد حساب مرتبط بهذا الجوال، سيصلك رمز التحقق عبر واتساب.'
  );
}

export async function verifyPasswordResetOtp(
  phone: string,
  code: string,
  password: string,
): Promise<string> {
  const res = await callAuthPhoneOtp({
    action: 'verify_reset' as OtpAction,
    phone: phone.trim(),
    code: code.trim(),
    password,
  });
  return res.message || 'تم تحديث كلمة المرور بنجاح.';
}

export async function requestTeacherSignupOtp(opts: {
  phone: string;
  fullName: string;
  signupCode: string;
}): Promise<string> {
  const res = await callAuthPhoneOtp({
    action: 'request_signup' as OtpAction,
    phone: opts.phone.trim(),
    full_name: opts.fullName.trim(),
    signup_code: opts.signupCode.trim(),
  });
  return res.message || 'تم إرسال رمز التحقق إلى واتسابك.';
}

export async function verifyTeacherSignupOtp(opts: {
  phone: string;
  code: string;
  fullName: string;
  signupCode: string;
}): Promise<void> {
  const res = await callAuthPhoneOtp({
    action: 'verify_signup' as OtpAction,
    phone: opts.phone.trim(),
    code: opts.code.trim(),
    full_name: opts.fullName.trim(),
    signup_code: opts.signupCode.trim(),
  });

  if (!res.token_hash) {
    throw new Error(res.message || 'تم إنشاء الحساب — سجّل الدخول من شاشة الطاقم');
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: res.token_hash,
    type: 'email',
  });

  if (error) {
    throw new Error(error.message || 'تم إنشاء الحساب — سجّل الدخول بالجوال');
  }
}
