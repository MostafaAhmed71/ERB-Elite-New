/**
 * auth-phone-otp — دخول المعلم بـ OTP واتساب + إعادة تعيين كلمة المرور للجوال
 *
 * Actions:
 *   request_login | verify_login | request_reset | verify_reset
 *   request_signup | verify_signup  (تسجيل معلم بالجوال + كود التفعيل)
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WHATSAPP_API_URL (اختياري)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, prefer, accept, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime',
  'Access-Control-Max-Age': '86400',
};

const OTP_TTL_MS = 5 * 60 * 1000;
const RATE_LIMIT_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const GENERIC_SENT =
  'إن وُجد حساب مرتبط بهذا الجوال، سيصلك رمز التحقق عبر واتساب خلال لحظات.';

const STAFF_ROLES = [
  'teacher',
  'principal',
  'admin',
  'activity_leader',
  'supervisor',
  'deputy',
  'reviewer',
] as const;

type Action =
  | 'request_login'
  | 'verify_login'
  | 'request_reset'
  | 'verify_reset'
  | 'request_signup'
  | 'verify_signup';

type OtpPurpose = 'login' | 'password_reset' | 'teacher_signup';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizePhoneE164(phone: string): string {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('05')) p = '966' + p.slice(1);
  else if (p.startsWith('5') && p.length === 9) p = '966' + p;
  else if (p.startsWith('0') && p.length === 10) p = '966' + p.slice(1);
  return p;
}

function phoneMatchVariants(e164: string): string[] {
  const variants = new Set<string>([e164]);
  if (e164.startsWith('966') && e164.length >= 12) {
    const local = '0' + e164.slice(3);
    variants.add(local);
    variants.add(e164.slice(3)); // 5xxxxxxxx
  }
  return [...variants];
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomOtp6(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
}

type AdminClient = ReturnType<typeof createClient>;

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

async function sendWhatsApp(admin: AdminClient, phoneE164: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const base = await resolveWhatsAppBase(admin);
  try {
    const res = await fetch(`${base}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneE164, message }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.ok === false || body?.success === false) {
      return { ok: false, error: body?.error || `WhatsApp HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل الاتصال بخادم واتساب' };
  }
}

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  phone: string | null;
  is_active: boolean | null;
};

async function findUserByPhone(
  admin: AdminClient,
  phoneE164: string,
  roles: readonly string[],
): Promise<UserRow | null> {
  const variants = phoneMatchVariants(phoneE164);
  const { data, error } = await admin
    .from('users')
    .select('id, email, full_name, role, phone, is_active')
    .in('role', [...roles])
    .eq('is_active', true);

  if (error || !data?.length) return null;

  const match = (data as UserRow[]).find((u) => {
    if (!u.phone) return false;
    const stored = normalizePhoneE164(u.phone);
    return variants.includes(stored) || phoneMatchVariants(stored).some((v) => variants.includes(v));
  });
  return match ?? null;
}

async function recentRequestExists(
  admin: AdminClient,
  phoneE164: string,
  purpose: string,
): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_MS).toISOString();
  const { data } = await admin
    .from('auth_phone_otp')
    .select('id')
    .eq('phone_e164', phoneE164)
    .eq('purpose', purpose)
    .gte('created_at', since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function insertOtp(
  admin: AdminClient,
  userId: string | null,
  phoneE164: string,
  purpose: OtpPurpose,
  code: string,
): Promise<void> {
  const code_hash = await sha256Hex(code);
  const expires_at = new Date(Date.now() + OTP_TTL_MS).toISOString();
  await admin
    .from('auth_phone_otp')
    .update({ consumed_at: new Date().toISOString() })
    .eq('phone_e164', phoneE164)
    .eq('purpose', purpose)
    .is('consumed_at', null);

  const { error } = await admin.from('auth_phone_otp').insert({
    user_id: userId,
    phone_e164: phoneE164,
    purpose,
    code_hash,
    expires_at,
  });
  if (error) throw new Error(error.message);
}

type OtpRow = {
  id: string;
  user_id: string | null;
  code_hash: string;
  expires_at: string;
  attempts: number;
  consumed_at: string | null;
};

async function validateOtp(
  admin: AdminClient,
  phoneE164: string,
  purpose: OtpPurpose,
  code: string,
): Promise<{ ok: true; otpId: string; user_id: string | null } | { ok: false; error: string }> {
  const { data: rows, error } = await admin
    .from('auth_phone_otp')
    .select('id, user_id, code_hash, expires_at, attempts, consumed_at')
    .eq('phone_e164', phoneE164)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) return { ok: false, error: 'تعذر التحقق من الرمز' };
  const row = (rows?.[0] ?? null) as OtpRow | null;
  if (!row) return { ok: false, error: 'انتهت صلاحية الرمز أو لم يُطلب بعد. اطلب رمزاً جديداً.' };

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await admin.from('auth_phone_otp').update({ consumed_at: new Date().toISOString() }).eq('id', row.id);
    return { ok: false, error: 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.' };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await admin.from('auth_phone_otp').update({ consumed_at: new Date().toISOString() }).eq('id', row.id);
    return { ok: false, error: 'تجاوزت عدد المحاولات. اطلب رمزاً جديداً.' };
  }

  const hash = await sha256Hex(code.trim());
  if (hash !== row.code_hash) {
    await admin
      .from('auth_phone_otp')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id);
    return { ok: false, error: 'رمز التحقق غير صحيح' };
  }

  return { ok: true, otpId: row.id, user_id: row.user_id };
}

async function markOtpConsumed(admin: AdminClient, otpId: string): Promise<void> {
  await admin.from('auth_phone_otp').update({ consumed_at: new Date().toISOString() }).eq('id', otpId);
}

async function consumeOtp(
  admin: AdminClient,
  phoneE164: string,
  purpose: OtpPurpose,
  code: string,
): Promise<{ ok: true; user_id: string | null } | { ok: false; error: string }> {
  const verified = await validateOtp(admin, phoneE164, purpose, code);
  if (!verified.ok) return verified;
  await markOtpConsumed(admin, verified.otpId);
  return { ok: true, user_id: verified.user_id };
}

async function readTeacherSignupCode(admin: AdminClient): Promise<string> {
  const { data } = await admin
    .from('academic_config')
    .select('value')
    .eq('key', 'teacher_signup_code')
    .maybeSingle();
  if (data?.value == null) return '';
  const raw = typeof data.value === 'string' ? data.value : String(data.value);
  return raw.replace(/^"|"$/g, '').trim().toUpperCase();
}

function syntheticTeacherEmail(phoneE164: string): string {
  return `t${phoneE164}@phone.erb.local`;
}

async function phoneAlreadyRegistered(admin: AdminClient, phoneE164: string): Promise<boolean> {
  const existing = await findUserByPhone(admin, phoneE164, [
    ...STAFF_ROLES,
    'student',
    'parent',
    'platform_developer',
  ]);
  if (existing) return true;

  // حسابات الجوال تُنشأ ببريد اصطناعي — كشف المحاولات السابقة حتى بدون رقم في users.phone
  const email = syntheticTeacherEmail(phoneE164);
  const { data: byEmail } = await admin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  return !!byEmail;
}

function isAuthEmailTakenError(message: string | undefined): boolean {
  if (!message) return false;
  return /already\s+(been\s+)?registered|user already registered|email.?exists|duplicate/i.test(
    message,
  );
}

/** إنشاء معلم أو استعادة حساب Auth يتيم من محاولة تسجيل سابقة */
async function ensureTeacherAuthUser(
  admin: AdminClient,
  opts: {
    email: string;
    password: string;
    fullName: string;
    localPhone: string;
  },
): Promise<{ userId: string } | { status: number; error: string }> {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: opts.email,
    password: opts.password,
    email_confirm: true,
    user_metadata: {
      full_name: opts.fullName,
      role: 'teacher',
      phone: opts.localPhone,
    },
  });

  if (created?.user?.id) {
    return { userId: created.user.id };
  }

  if (!isAuthEmailTakenError(createErr?.message)) {
    return {
      status: 500,
      error: createErr?.message || 'تعذر إنشاء الحساب',
    };
  }

  const { data: existingProfile } = await admin
    .from('users')
    .select('id, role, is_active')
    .eq('email', opts.email)
    .maybeSingle();

  if (existingProfile?.id) {
    return {
      status: 409,
      error: 'هذا الجوال مسجّل مسبقاً — استخدم تسجيل الدخول من شاشة الطاقم',
    };
  }

  // Auth موجود بدون صف users مكتمل (محاولة سابقة فشلت بعد createUser)
  const { data: linkProbe, error: probeErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: opts.email,
  });
  const orphanId = linkProbe?.user?.id;
  if (probeErr || !orphanId) {
    return {
      status: 409,
      error:
        'هذا الجوال مرتبط بمحاولة تسجيل سابقة — سجّل الدخول بالجوال أو تواصل مع إدارة المدرسة',
    };
  }

  await admin.auth.admin.updateUserById(orphanId, {
    password: opts.password,
    email_confirm: true,
    user_metadata: {
      full_name: opts.fullName,
      role: 'teacher',
      phone: opts.localPhone,
    },
  });

  return { userId: orphanId };
}

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
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
    if (!supabaseUrl || !serviceKey) {
      return json(500, { error: 'Server misconfigured' });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = (await req.json().catch(() => ({}))) as {
      action?: Action;
      phone?: string;
      code?: string;
      password?: string;
      full_name?: string;
      signup_code?: string;
    };

    const action = body.action;
    if (!action) return json(400, { error: 'action مطلوب' });

    const phoneRaw = (body.phone ?? '').trim();
    if (!phoneRaw) return json(400, { error: 'رقم الجوال مطلوب' });
    const phoneE164 = normalizePhoneE164(phoneRaw);
    if (phoneE164.length < 12) {
      return json(400, { error: 'رقم الجوال غير صالح. استخدم صيغة 05xxxxxxxx' });
    }

    // ─── request_login (معلم فقط) ───
    if (action === 'request_login') {
      if (await recentRequestExists(admin, phoneE164, 'login')) {
        return json(429, { error: 'انتظر دقيقة قبل طلب رمز جديد' });
      }

      let user = await findUserByPhone(admin, phoneE164, ['teacher']);
      if (!user) {
        const synEmail = syntheticTeacherEmail(phoneE164);
        const { data: byEmail } = await admin
          .from('users')
          .select('id, email, full_name, role, phone, is_active')
          .eq('email', synEmail)
          .eq('role', 'teacher')
          .eq('is_active', true)
          .maybeSingle();
        user = (byEmail as UserRow | null) ?? null;
      }

      if (!user?.email) {
        return json(400, {
          error:
            'هذا الجوال غير مسجّل كمعلم. أنشئ حساباً جديداً عبر «تسجيل معلم جديد».',
          not_registered: true,
        });
      }

      const code = randomOtp6();
      await insertOtp(admin, user.id, phoneE164, 'login', code);
      const name = user.full_name?.trim() || 'المعلم';
      const msg =
        `السلام عليكم ${name}،\n\n` +
        `رمز الدخول إلى أولمبياد النخبة:\n` +
        `*${code}*\n\n` +
        `صالح لمدة 5 دقائق. لا تشارك الرمز مع أحد.`;
      const sent = await sendWhatsApp(admin, phoneE164, msg);
      if (!sent.ok) {
        return json(502, { error: 'تعذر إرسال واتساب. تأكد من اتصال خادم الواتساب ثم أعد المحاولة.' });
      }
      return json(200, {
        ok: true,
        message: 'تم إرسال رمز التحقق إلى واتسابك.',
      });
    }

    // ─── verify_login ───
    if (action === 'verify_login') {
      const code = (body.code ?? '').trim();
      if (!/^\d{6}$/.test(code)) return json(400, { error: 'أدخل رمز التحقق المكوّن من 6 أرقام' });

      const verified = await consumeOtp(admin, phoneE164, 'login', code);
      if (!verified.ok) return json(400, { error: verified.error });
      if (!verified.user_id) return json(400, { error: 'رمز غير صالح' });

      const { data: profile } = await admin
        .from('users')
        .select('id, email, role, is_active')
        .eq('id', verified.user_id)
        .maybeSingle();

      if (!profile?.email || profile.role !== 'teacher' || profile.is_active === false) {
        return json(403, { error: 'الحساب غير صالح لدخول المعلم' });
      }

      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: profile.email,
      });

      if (linkErr || !linkData) {
        return json(500, { error: linkErr?.message || 'تعذر إنشاء جلسة الدخول' });
      }

      const props = linkData.properties as {
        hashed_token?: string;
        email_otp?: string;
      };

      const token_hash = props?.hashed_token;
      if (!token_hash) {
        return json(500, { error: 'تعذر إنشاء رمز الجلسة' });
      }

      return json(200, {
        ok: true,
        token_hash,
        email: profile.email,
        type: 'email',
      });
    }

    // ─── request_reset (طاقم له جوال) ───
    if (action === 'request_reset') {
      if (await recentRequestExists(admin, phoneE164, 'password_reset')) {
        return json(429, { error: 'انتظر دقيقة قبل طلب رمز جديد' });
      }

      const user = await findUserByPhone(admin, phoneE164, STAFF_ROLES);
      if (!user?.email) {
        return json(400, {
          error:
            'هذا الجوال غير مرتبط بحساب طاقم. إن سجّلت عبر Google أضف الجوال من إكمال الملف أولاً، أو أنشئ حساباً جديداً.',
          not_registered: true,
        });
      }

      const code = randomOtp6();
      await insertOtp(admin, user.id, phoneE164, 'password_reset', code);
      const name = user.full_name?.trim() || 'المستخدم';
      const msg =
        `السلام عليكم ${name}،\n\n` +
        `رمز إعادة تعيين كلمة المرور في أولمبياد النخبة:\n` +
        `*${code}*\n\n` +
        `صالح لمدة 5 دقائق. لا تشارك الرمز مع أحد.`;
      const sent = await sendWhatsApp(admin, phoneE164, msg);
      if (!sent.ok) {
        return json(502, { error: 'تعذر إرسال واتساب. تأكد من اتصال خادم الواتساب ثم أعد المحاولة.' });
      }
      return json(200, {
        ok: true,
        message: 'تم إرسال رمز إعادة التعيين إلى واتسابك.',
      });
    }

    // ─── verify_reset ───
    if (action === 'verify_reset') {
      const code = (body.code ?? '').trim();
      const password = body.password ?? '';
      if (!/^\d{6}$/.test(code)) return json(400, { error: 'أدخل رمز التحقق المكوّن من 6 أرقام' });
      if (password.length < 8) return json(400, { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });

      const verified = await consumeOtp(admin, phoneE164, 'password_reset', code);
      if (!verified.ok) return json(400, { error: verified.error });
      if (!verified.user_id) return json(400, { error: 'رمز غير صالح' });

      const { data: profile } = await admin
        .from('users')
        .select('id, role, is_active')
        .eq('id', verified.user_id)
        .maybeSingle();

      if (!profile || profile.is_active === false || !STAFF_ROLES.includes(profile.role as typeof STAFF_ROLES[number])) {
        return json(403, { error: 'الحساب غير صالح لإعادة التعيين' });
      }

      const { error: updErr } = await admin.auth.admin.updateUserById(verified.user_id, {
        password,
      });
      if (updErr) {
        return json(500, { error: updErr.message || 'تعذر تحديث كلمة المرور' });
      }

      return json(200, {
        ok: true,
        message: 'تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.',
      });
    }

    // ─── request_signup (معلم جديد بالجوال) ───
    if (action === 'request_signup') {
      const signupCode = (body.signup_code ?? '').trim().toUpperCase();
      const fullName = (body.full_name ?? '').trim();
      if (!signupCode) return json(400, { error: 'كود التفعيل مطلوب' });
      if (fullName.length < 3) return json(400, { error: 'الاسم الكامل مطلوب' });

      const expected = await readTeacherSignupCode(admin);
      if (!expected || signupCode !== expected) {
        return json(400, { error: 'كود التفعيل غير صحيح' });
      }

      if (await phoneAlreadyRegistered(admin, phoneE164)) {
        return json(409, { error: 'هذا الجوال مسجّل مسبقاً — استخدم تسجيل الدخول' });
      }

      if (await recentRequestExists(admin, phoneE164, 'teacher_signup')) {
        return json(429, { error: 'انتظر دقيقة قبل طلب رمز جديد' });
      }

      const code = randomOtp6();
      await insertOtp(admin, null, phoneE164, 'teacher_signup', code);
      const msg =
        `السلام عليكم ${fullName}،\n\n` +
        `رمز تأكيد تسجيل حساب المعلم في أولمبياد النخبة:\n` +
        `*${code}*\n\n` +
        `صالح لمدة 5 دقائق. لا تشارك الرمز مع أحد.`;
      const sent = await sendWhatsApp(admin, phoneE164, msg);
      if (!sent.ok) {
        return json(502, {
          error: 'تعذر إرسال واتساب. تأكد من اتصال خادم الواتساب ثم أعد المحاولة.',
        });
      }
      return json(200, { ok: true, message: 'تم إرسال رمز التحقق إلى واتسابك.' });
    }

    // ─── verify_signup ───
    if (action === 'verify_signup') {
      const otp = (body.code ?? '').trim();
      const signupCode = (body.signup_code ?? '').trim().toUpperCase();
      const fullName = (body.full_name ?? '').trim();
      if (!/^\d{6}$/.test(otp)) return json(400, { error: 'أدخل رمز التحقق المكوّن من 6 أرقام' });
      if (!signupCode) return json(400, { error: 'كود التفعيل مطلوب' });
      if (fullName.length < 3) return json(400, { error: 'الاسم الكامل مطلوب' });

      const expected = await readTeacherSignupCode(admin);
      if (!expected || signupCode !== expected) {
        return json(400, { error: 'كود التفعيل غير صحيح' });
      }

      if (await phoneAlreadyRegistered(admin, phoneE164)) {
        return json(409, { error: 'هذا الجوال مسجّل مسبقاً — استخدم تسجيل الدخول' });
      }

      // تحقق من الرمز دون استهلاكه أولاً — حتى لا يُحرق عند فشل إنشاء الحساب
      const verified = await validateOtp(admin, phoneE164, 'teacher_signup', otp);
      if (!verified.ok) return json(400, { error: verified.error });

      const email = syntheticTeacherEmail(phoneE164);
      const password = randomPassword();
      const localPhone = phoneE164.startsWith('966') ? '0' + phoneE164.slice(3) : phoneE164;

      const ensured = await ensureTeacherAuthUser(admin, {
        email,
        password,
        fullName,
        localPhone,
      });
      if ('error' in ensured) {
        return json(ensured.status, { error: ensured.error });
      }

      const userId = ensured.userId;

      await admin.from('users').upsert({
        id: userId,
        email,
        full_name: fullName,
        role: 'teacher',
        phone: localPhone,
        is_active: true,
        is_first_login: false,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });

      await admin.from('teachers').upsert(
        {
          user_id: userId,
          subject: null,
          points_budget: 100,
          weekly_points_limit: 100,
        },
        { onConflict: 'user_id' },
      );

      await markOtpConsumed(admin, verified.otpId);

      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

      if (linkErr || !linkData) {
        return json(500, {
          error: linkErr?.message || 'تم إنشاء الحساب لكن تعذر فتح الجلسة — سجّل الدخول بالجوال',
        });
      }

      const token_hash = (linkData.properties as { hashed_token?: string })?.hashed_token;
      if (!token_hash) {
        return json(500, { error: 'تم إنشاء الحساب — سجّل الدخول بالجوال من شاشة الطاقم' });
      }

      return json(200, {
        ok: true,
        token_hash,
        email,
        type: 'email',
        message: 'تم إنشاء حساب المعلم بنجاح',
      });
    }

    return json(400, { error: 'action غير معروف' });
  } catch (e) {
    console.error('auth-phone-otp error', e);
    return json(500, {
      error: e instanceof Error ? e.message : 'خطأ غير متوقع',
    });
  }
});
