import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STAFF_ROLES = ['admin', 'supervisor', 'teacher'] as const;

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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (callerProfile?.role !== 'principal') {
      return new Response(JSON.stringify({ error: 'فقط مدير المدرسة يمكنه إرسال الدعوات' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, role } = await req.json();
    if (!email || !role || !STAFF_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: 'البريد والدور مطلوبان (معلم، مشرف، رائد نشاط)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: invite, error } = await supabaseAdmin
      .from('staff_invites')
      .insert({ email: email.trim().toLowerCase(), role, created_by: caller.id })
      .select('token, expires_at')
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: caller.id,
      action: 'STAFF_INVITE_CREATED',
      entity: 'staff_invites',
      metadata: { email, role },
    });

    return new Response(JSON.stringify({ token: invite.token, expires_at: invite.expires_at }), {
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
