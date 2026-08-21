/**
 * setup-whatsapp-phone — حفظ جوال واتساب بعد أول دخول + رسالة ترحيب
 *
 * Body: { phone: string }
 * Auth: Bearer access_token للمستخدم
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, prefer, accept, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime',
  'Access-Control-Max-Age': '86400',
};

type AdminClient = ReturnType<typeof createClient>;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizePhoneE164(phone: string): string {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('00966')) p = p.slice(2);
  if (p.startsWith('05')) p = '966' + p.slice(1);
  else if (p.startsWith('5') && p.length === 9) p = '966' + p;
  else if (p.startsWith('0') && p.length === 10) p = '966' + p.slice(1);
  return p;
}

function phoneMatchVariants(e164: string): string[] {
  const variants = new Set<string>([e164]);
  if (e164.startsWith('966') && e164.length >= 12) {
    variants.add('0' + e164.slice(3));
    variants.add(e164.slice(3));
    variants.add('+' + e164);
  }
  return [...variants];
}

function isValidSaudiMobile(e164: string): boolean {
  return /^9665\d{8}$/.test(e164);
}

async function resolveWhatsAppBase(admin: AdminClient): Promise<string> {
  const fromEnv = (Deno.env.get('WHATSAPP_API_URL') ?? '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const { data } = await admin
    .from('academic_config')
    .select('value')
    .eq('key', 'whatsapp_api_url')
    .maybeSingle();
  let fromDb = '';
  if (data?.value != null) {
    const raw = data.value;
    fromDb = (typeof raw === 'string' ? raw : String(raw))
      .replace(/^"|"$/g, '')
      .trim()
      .replace(/\/$/, '');
  }
  return fromDb || 'https://wpp.northelite0.com';
}

function isNoWhatsAppError(msg: string): boolean {
  return /غير متاح على واتساب|not available on whatsapp|number.*not.*(exist|available)|not registered on whatsapp|لا يوجد عليه واتساب/i.test(
    msg,
  );
}

function isOfflineError(msg: string): boolean {
  return /غير متصل|not connected|afk|qr|session/i.test(msg);
}

async function sendWhatsApp(
  base: string,
  phoneE164: string,
  message: string,
): Promise<{ ok: boolean; error?: string; noWhatsApp?: boolean; offline?: boolean }> {
  try {
    const res = await fetch(`${base}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneE164, message }),
    });
    const body = await res.json().catch(() => ({}));
    const errMsg = String(body?.error ?? body?.message ?? '');
    if (!res.ok || body?.ok === false || body?.success === false) {
      if (isNoWhatsAppError(errMsg)) {
        return {
          ok: false,
          noWhatsApp: true,
          error: 'هذا الرقم لا يوجد عليه واتساب. أدخل رقماً عليه واتساب فعّال.',
        };
      }
      if (res.status === 503 || isOfflineError(errMsg)) {
        return {
          ok: false,
          offline: true,
          error: 'خادم واتساب غير متصل حالياً. أعد المحاولة بعد قليل.',
        };
      }
      return { ok: false, error: errMsg || `WhatsApp HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل الاتصال بخادم واتساب' };
  }
}

function welcomeMessage(fullName: string, role: string): string {
  const name = fullName?.trim() || 'عزيزي المستخدم';
  const roleLabel =
    role === 'parent' ? 'ولي الأمر' : role === 'student' ? 'الطالب' : 'المستخدم';
  return (
    `مرحباً ${name} 👋\n\n` +
    `أهلاً بك في *أولمبياد النخبة 1448 هــ*\n` +
    `تم تفعيل حسابك كـ${roleLabel} بنجاح.\n\n` +
    `نحو القمة بالتميز ✨\n` +
    `ستصلك تنبيهات مهمة عبر واتساب على هذا الرقم.`
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    const requested = req.headers.get('Access-Control-Request-Headers');
    const headers = { ...corsHeaders };
    if (requested) headers['Access-Control-Allow-Headers'] = requested;
    return new Response('ok', { headers });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SB_ANON_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return json(500, { error: 'Server misconfigured' });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { error: 'يجب تسجيل الدخول' });
    }

    const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.slice('Bearer '.length);
    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authData.user) {
      return json(401, { error: 'جلسة غير صالحة — أعد تسجيل الدخول' });
    }
    const userId = authData.user.id;
    const authUser = authData.user;

    const body = await req.json().catch(() => ({}));
    const phoneRaw = String(body?.phone ?? '').trim();
    if (!phoneRaw) {
      return json(400, { error: 'أدخل رقم الجوال', code: 'EMPTY_PHONE' });
    }

    const phoneE164 = normalizePhoneE164(phoneRaw);
    if (!isValidSaudiMobile(phoneE164)) {
      return json(400, {
        code: 'INVALID_PHONE',
        error: 'رقم الجوال غير صحيح. استخدم صيغة سعودية مثل 05XXXXXXXX',
      });
    }

    let { data: profile, error: profileErr } = await admin
      .from('users')
      .select('id, full_name, role, phone, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) {
      console.error('profile lookup', profileErr.message);
      return json(500, { error: 'تعذر قراءة الملف الشخصي', detail: profileErr.message });
    }

    // حساب مولَّد قد يفتقد الصف أحياناً — أنشئه من بيانات الجلسة
    if (!profile) {
      const metaRole = String(authUser.user_metadata?.role ?? 'student');
      const role =
        metaRole === 'parent' || metaRole === 'student' ? metaRole : 'student';
      const fullName = String(
        authUser.user_metadata?.full_name ?? authUser.email ?? 'مستخدم',
      );
      const { error: upsertErr } = await admin.from('users').upsert(
        {
          id: userId,
          email: authUser.email ?? `${userId}@local`,
          full_name: fullName,
          role,
          is_active: true,
          is_first_login: false,
          onboarding_completed: true,
        },
        { onConflict: 'id' },
      );
      if (upsertErr) {
        return json(500, {
          error: 'تعذر تجهيز الملف الشخصي',
          detail: upsertErr.message,
        });
      }
      profile = {
        id: userId,
        full_name: fullName,
        role,
        phone: null,
        is_active: true,
      };
    }

    if (profile.is_active === false) {
      return json(403, { error: 'الحساب غير مفعّل' });
    }

    const variants = phoneMatchVariants(phoneE164);
    const { data: others } = await admin
      .from('users')
      .select('id, phone')
      .neq('id', userId)
      .not('phone', 'is', null);

    const taken = (others ?? []).some((u) => {
      if (!u.phone) return false;
      const stored = normalizePhoneE164(u.phone);
      return variants.includes(stored) || phoneMatchVariants(stored).some((v) => variants.includes(v));
    });
    if (taken) {
      return json(409, {
        code: 'PHONE_TAKEN',
        error: 'هذا الرقم مرتبط بحساب آخر في المنصة',
      });
    }

    const base = await resolveWhatsAppBase(admin);
    const msg = welcomeMessage(String(profile.full_name ?? ''), String(profile.role ?? ''));
    // المصدر الموثوق: الإرسال نفسه (يتحقق داخلياً من وجود الرقم على واتساب)
    const sent = await sendWhatsApp(base, phoneE164, msg);
    if (!sent.ok) {
      if (sent.noWhatsApp) {
        return json(400, {
          ok: false,
          code: 'NO_WHATSAPP',
          error: sent.error,
        });
      }
      if (sent.offline) {
        return json(503, { code: 'WA_OFFLINE', error: sent.error });
      }
      return json(502, {
        code: 'SEND_FAILED',
        error: sent.error || 'تعذر إرسال رسالة واتساب. أعد المحاولة.',
      });
    }

    const displayPhone = '0' + phoneE164.slice(3);
    const { error: updErr } = await admin
      .from('users')
      .update({
        phone: displayPhone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updErr) {
      return json(500, {
        error: 'تم الإرسال لكن تعذر حفظ الرقم — أعد المحاولة',
        detail: updErr.message,
      });
    }

    try {
      await userClient.auth.updateUser({ data: { phone: displayPhone } });
    } catch {
      /* ignore */
    }

    return json(200, {
      ok: true,
      phone: displayPhone,
      message: 'تم حفظ الرقم وإرسال رسالة ترحيب على واتساب.',
    });
  } catch (e) {
    console.error('setup-whatsapp-phone', e);
    return json(500, { error: e instanceof Error ? e.message : 'خطأ غير متوقع' });
  }
});
