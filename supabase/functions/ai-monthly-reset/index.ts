/**
 * ai-monthly-reset — إعادة تعيين رصيد AI الشهري
 *
 * يُستدعى بـ service role فقط (cron / يدوي من لوحة التحكم عبر نفس المسار).
 * لكل معلم: إذا reset_type=monthly و reset_date <= اليوم → تصفير used_credit وتأجيل reset_date شهراً.
 *
 * جدولة: انظر تعليق migration 085
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

function todayRiyadh(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
}

function addOneMonth(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() + 1);
  return dt.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) return json(503, { error: 'Supabase not configured' });

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token || token !== serviceKey) {
      return json(401, { error: 'Service role required' });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: settings } = await admin.from('ai_credit_settings').select('reset_type').limit(1).maybeSingle();
    if ((settings?.reset_type ?? 'monthly') !== 'monthly') {
      return json(200, { ok: true, skipped: true, reason: 'reset_type is not monthly', reset_count: 0 });
    }

    const today = todayRiyadh();
    const { data: rows, error } = await admin
      .from('ai_credit_balance')
      .select('id, teacher_id, used_credit, reset_date')
      .lte('reset_date', today);

    if (error) return json(500, { error: error.message });

    let resetCount = 0;
    for (const row of rows ?? []) {
      const nextReset = addOneMonth(row.reset_date ?? today);
      const { error: upErr } = await admin
        .from('ai_credit_balance')
        .update({
          used_credit: 0,
          reset_date: nextReset,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (upErr) continue;

      await admin.from('ai_credit_transactions').insert({
        teacher_id: row.teacher_id,
        action: 'monthly_reset',
        credits: 0,
        status: 'success',
        meta: { previous_used: row.used_credit, previous_reset_date: row.reset_date, next_reset: nextReset },
      });
      resetCount += 1;
    }

    return json(200, { ok: true, reset_count: resetCount, today });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : 'خطأ غير متوقع' });
  }
});
