/**
 * ai-credits — إدارة رصيد الذكاء الاصطناعي
 * GET: رصيد المستخدم الحالي أو (للمدير) معلم محدد ?teacher_id=
 * POST actions: add | set_disabled | reset_month | update_settings | update_catalog
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) return json(503, { error: 'Supabase not configured' });

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'Unauthorized' });

    const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return json(401, { error: 'Unauthorized' });

    const { data: profile } = await admin
      .from('users')
      .select('id, role, full_name')
      .eq('id', userData.user.id)
      .maybeSingle();

    const role = profile?.role as string | undefined;
    const isPrincipal = role === 'principal' || role === 'admin';

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const teacherId = url.searchParams.get('teacher_id') || userData.user.id;
      if (teacherId !== userData.user.id && !isPrincipal) {
        return json(403, { error: 'FORBIDDEN' });
      }

      await admin.rpc('ai_ensure_teacher_balance', { p_teacher_id: teacherId });

      const { data: balance } = await admin
        .from('ai_credit_balance')
        .select('*')
        .eq('teacher_id', teacherId)
        .maybeSingle();

      const { data: history } = await admin
        .from('ai_credit_transactions')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: settings } = await admin.from('ai_credit_settings').select('*').limit(1).maybeSingle();

      let usageStats = null;
      if (isPrincipal && url.searchParams.get('stats') === '1') {
        const { data: allTx } = await admin
          .from('ai_credit_transactions')
          .select('teacher_id, credits, action, created_at, status')
          .eq('status', 'success')
          .gt('credits', 0)
          .order('created_at', { ascending: false })
          .limit(500);
        usageStats = allTx ?? [];
      }

      return json(200, { balance, history: history ?? [], settings, usageStats });
    }

    if (req.method === 'POST') {
      if (!isPrincipal) return json(403, { error: 'المدير فقط' });
      const body = await req.json();
      const action = String(body.action || '');

      if (action === 'add') {
        const { data, error } = await admin.rpc('ai_add_credits', {
          p_teacher_id: body.teacher_id,
          p_credits: Number(body.credits),
          p_note: body.note ?? null,
        });
        if (error) return json(400, { error: error.message });
        return json(200, { ok: true, balance: data });
      }

      if (action === 'set_disabled') {
        const { data, error } = await admin.rpc('ai_set_teacher_disabled', {
          p_teacher_id: body.teacher_id,
          p_disabled: !!body.disabled,
        });
        if (error) return json(400, { error: error.message });
        return json(200, { ok: true, balance: data });
      }

      if (action === 'update_settings') {
        const { data: row } = await admin.from('ai_credit_settings').select('id').limit(1).maybeSingle();
        if (!row) return json(404, { error: 'settings missing' });
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const k of [
          'default_monthly_credit',
          'reset_type',
          'allow_bonus',
          'allow_regenerate',
          'max_credit_per_request',
          'openrouter_model',
          'ai_provider',
          'billing_mode',
          'tokens_per_credit',
          'usd_per_1m_tokens',
        ]) {
          if (body[k] !== undefined) patch[k] = body[k];
        }
        const { data, error } = await admin
          .from('ai_credit_settings')
          .update(patch)
          .eq('id', row.id)
          .select()
          .single();
        if (error) return json(400, { error: error.message });
        return json(200, { ok: true, settings: data });
      }

      if (action === 'update_catalog') {
        const { data, error } = await admin
          .from('ai_credit_catalog')
          .update({
            default_credit: Number(body.default_credit),
            is_active: body.is_active !== undefined ? !!body.is_active : true,
            updated_at: new Date().toISOString(),
          })
          .eq('task_code', body.task_code)
          .select()
          .single();
        if (error) return json(400, { error: error.message });
        return json(200, { ok: true, item: data });
      }

      if (action === 'reset_month') {
        const teacherId = body.teacher_id as string;
        const { data: settings } = await admin.from('ai_credit_settings').select('default_monthly_credit').limit(1).maybeSingle();
        const monthly = Number(settings?.default_monthly_credit ?? 100);
        await admin.rpc('ai_ensure_teacher_balance', { p_teacher_id: teacherId });
        const { data, error } = await admin
          .from('ai_credit_balance')
          .update({
            monthly_credit: monthly,
            used_credit: 0,
            reset_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
              .toISOString()
              .slice(0, 10),
            updated_at: new Date().toISOString(),
          })
          .eq('teacher_id', teacherId)
          .select()
          .single();
        if (error) return json(400, { error: error.message });
        await admin.from('ai_credit_transactions').insert({
          teacher_id: teacherId,
          action: 'monthly_reset',
          credits: 0,
          status: 'success',
          meta: { monthly },
        });
        return json(200, { ok: true, balance: data });
      }

      return json(400, { error: 'unknown action' });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : 'خطأ غير متوقع' });
  }
});
