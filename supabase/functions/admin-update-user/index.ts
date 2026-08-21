// تحديث بريد/كلمة مرور مستخدم — رائد النشاط / مدير المدرسة (service_role)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_ROLES = ['principal', 'admin', 'activity_leader'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      data: { user: caller },
    } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

    if (!caller) {
      return new Response(JSON.stringify({ error: 'جلسة غير صالحة' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (!callerProfile?.role || !ALLOWED_ROLES.includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'غير مصرح لهذا الإجراء' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const user_id = body.user_id as string | undefined;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
    const password = typeof body.password === 'string' ? body.password : undefined;

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'معرّف المستخدم مطلوب' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!email && !password) {
      return new Response(JSON.stringify({ error: 'أدخل بريداً أو كلمة مرور جديدة' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (password && password.length < 6) {
      return new Response(JSON.stringify({ error: 'كلمة المرور قصيرة جداً (6 أحرف على الأقل)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authUpdate: { email?: string; password?: string; email_confirm?: boolean } = {};
    if (email) {
      authUpdate.email = email;
      authUpdate.email_confirm = true;
    }
    if (password) authUpdate.password = password;

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, authUpdate);
    if (authErr) throw authErr;

    if (email) {
      await supabaseAdmin.from('users').update({ email }).eq('id', user_id);
    }

    const credPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (email) credPatch.email = email;
    if (password) {
      credPatch.display_password = password;
      credPatch.password_changed_by_user = false;
    }

    await supabaseAdmin
      .from('managed_account_credentials')
      .update(credPatch)
      .eq('user_id', user_id)
      .then(({ error }) => {
        if (error) console.warn('managed_account_credentials update:', error.message);
      });

    await supabaseAdmin.from('audit_logs').insert({
      user_id: caller.id,
      action: 'ADMIN_USER_CREDENTIALS_UPDATED',
      entity: 'users',
      entity_id: user_id,
      metadata: {
        email_updated: !!email,
        password_reset: !!password,
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
