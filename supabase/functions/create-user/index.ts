// Supabase Edge Function: create-user
// Called by the Principal to create new users server-side
// using the service_role key (not exposed to the client).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, prefer, accept, accept-profile, content-profile, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime',
  'Access-Control-Max-Age': '86400',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // CORS preflight — مرّر الترويسات المطلوبة من المتصفح إن وُجدت
  if (req.method === 'OPTIONS') {
    const requested = req.headers.get('Access-Control-Request-Headers');
    const headers = { ...corsHeaders };
    if (requested) headers['Access-Control-Allow-Headers'] = requested;
    return new Response('ok', { headers });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return json(500, { error: 'Server misconfigured: missing SUPABASE_URL or SERVICE_ROLE_KEY' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { error: 'Unauthorized' });
    }

    const token = authHeader.slice('Bearer '.length);
    const { data: { user: caller }, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !caller) {
      return json(401, { error: 'Invalid token — أعد تسجيل الدخول' });
    }

    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileErr) {
      return json(500, { error: `Profile lookup failed: ${profileErr.message}` });
    }

    const role = callerProfile?.role as string | undefined;
    if (
      role !== 'principal' &&
      role !== 'admin' &&
      role !== 'activity_leader' &&
      role !== 'platform_developer'
    ) {
      return json(403, {
        error: 'غير مصرح: فقط مدير المدرسة أو رائد النشاط أو مطور المنصة يمكنه إنشاء المستخدمين',
      });
    }

    const body = await req.json();
    const { email, password, full_name, role: newRole, is_first_login } = body ?? {};
    const staffLevelRaw = body?.staff_education_level;
    const staffEducationLevel =
      staffLevelRaw === 'middle' || staffLevelRaw === 'high' ? staffLevelRaw : null;

    if (!email || !password || !full_name || !newRole) {
      return json(400, {
        error: 'Missing required fields: email, password, full_name, role',
      });
    }

    if (String(newRole) === 'deputy' && !staffEducationLevel) {
      return json(400, {
        error: 'يجب تحديد مرحلة الوكيل (متوسط أو ثانوي)',
      });
    }

    const forceFirstLogin = is_first_login === true;
    // حساب إداري جاهز — لا شاشة اختيار طالب/ولي (مسار Google فقط يحتاجها)
    const onboardingCompleted = body.onboarding_completed !== false;

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password),
      email_confirm: true,
      user_metadata: {
        full_name: String(full_name).trim(),
        role: String(newRole),
        is_first_login: forceFirstLogin,
        onboarding_completed: onboardingCompleted,
        staff_education_level: staffEducationLevel,
      },
    });

    if (error) {
      return json(400, { error: error.message });
    }

    if (!data.user?.id) {
      return json(500, { error: 'User created but id missing' });
    }

    const profilePatch: Record<string, unknown> = {
      is_first_login: forceFirstLogin,
      onboarding_completed: onboardingCompleted,
    };
    if (String(newRole) === 'deputy' || String(newRole) === 'supervisor') {
      profilePatch.staff_education_level = staffEducationLevel;
    } else if (staffEducationLevel) {
      profilePatch.staff_education_level = staffEducationLevel;
    }

    const { error: profileUpdateErr } = await supabaseAdmin
      .from('users')
      .update(profilePatch)
      .eq('id', data.user.id);
    if (profileUpdateErr) {
      console.warn('profile flags update skipped:', profileUpdateErr.message);
    }

    await supabaseAdmin.from('audit_logs').insert({
      user_id: caller.id,
      action: 'USER_CREATED',
      entity: 'users',
      entity_id: data.user.id,
      metadata: {
        email,
        role: newRole,
        staff_education_level: staffEducationLevel,
        created_by: caller.id,
      },
    });

    return json(200, { user: { id: data.user.id, email: data.user.email } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json(500, { error: message });
  }
});
