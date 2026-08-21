import { supabase } from './supabase';
import { normalizePhoneDigits } from './authPhoneOtp';
import type { DbUser } from '../types';

export function needsWhatsAppPhoneSetup(profile: DbUser | null): boolean {
  if (!profile) return false;
  if (profile.role !== 'student' && profile.role !== 'parent') return false;
  const phone = (profile.phone ?? '').replace(/\D/g, '');
  return phone.length < 9;
}

export async function saveWhatsAppPhoneAndWelcome(phone: string): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const session = sessionData.session;
  if (!session?.access_token) {
    throw new Error('يجب تسجيل الدخول أولاً');
  }

  const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!baseUrl || !anonKey) {
    throw new Error('إعدادات Supabase غير مكتملة');
  }

  const digits = normalizePhoneDigits(phone);
  if (!/^9665\d{8}$/.test(digits) && !/^05\d{8}$/.test(phone.replace(/\D/g, ''))) {
    // normalizePhoneDigits converts 05… to 9665…
    if (!/^9665\d{8}$/.test(digits)) {
      throw new Error('أدخل رقم جوال سعودي صحيح مثل 05XXXXXXXX');
    }
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/functions/v1/setup-whatsapp-phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ phone: phone.trim() }),
    });
  } catch {
    throw new Error(
      'تعذّر الاتصال بالخادم. تحقق من الإنترنت أو انشر الدالة: supabase functions deploy setup-whatsapp-phone',
    );
  }

  const payload = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    message?: string;
    code?: string;
  };

  if (res.status === 404) {
    throw new Error(
      'دالة setup-whatsapp-phone غير منشورة. نفّذ: npx supabase functions deploy setup-whatsapp-phone --no-verify-jwt',
    );
  }

  if (!res.ok || payload.error) {
    const err = new Error(payload.error || `خطأ من الخادم (HTTP ${res.status})`) as Error & {
      code?: string;
    };
    err.code =
      payload.code ||
      (/لا يوجد عليه واتساب|غير متاح على واتساب/i.test(payload.error || '')
        ? 'NO_WHATSAPP'
        : undefined);
    throw err;
  }

  return payload.message || 'تم حفظ الرقم وإرسال رسالة الترحيب على واتساب.';
}
