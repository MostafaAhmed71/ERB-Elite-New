import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { token, email, password, full_name } = await req.json();
    if (!token || !email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'جميع الحقول مطلوبة' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'كلمة المرور 8 أحرف على الأقل' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from('staff_invites')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (inviteErr || !invite) {
      return new Response(JSON.stringify({ error: 'رابط الدعوة غير صالح أو منتهي' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (invite.email.toLowerCase() !== email.trim().toLowerCase()) {
      return new Response(JSON.stringify({ error: 'البريد لا يطابق الدعوة' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name, role: invite.role },
    });

    if (authErr) throw authErr;

    await supabaseAdmin
      .from('staff_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id);

    await supabaseAdmin.from('audit_logs').insert({
      user_id: authData.user.id,
      action: 'STAFF_INVITE_ACCEPTED',
      entity: 'users',
      entity_id: authData.user.id,
      metadata: { role: invite.role, invite_id: invite.id },
    });

    return new Response(JSON.stringify({ user_id: authData.user.id, role: invite.role }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
