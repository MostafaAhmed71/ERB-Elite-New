/**
 * weekly-parent-digest — إرسال ملخص أسبوعي لأولياء الأمور عبر Resend
 *
 * الجدولة (اختر أحد الخيارين):
 * 1) pg_cron + pg_net داخل Supabase:
 *    SELECT cron.schedule(
 *      'weekly-parent-digest',
 *      '0 8 * * 0',  -- كل أحد 8:00 UTC (11:00 بتوقيت السعودية)
 *      $$
 *      SELECT net.http_post(
 *        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/weekly-parent-digest',
 *        headers := jsonb_build_object(
 *          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
 *          'Content-Type', 'application/json'
 *        ),
 *        body := '{}'::jsonb
 *      );
 *      $$
 *    );
 *
 * 2) cron خارجي (GitHub Actions / Hostinger / cron-job.org):
 *    POST https://YOUR_PROJECT.supabase.co/functions/v1/weekly-parent-digest
 *    Header: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *
 * متغيرات البيئة المطلوبة:
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (تلقائياً)
 * - RESEND_API_KEY — مطلوب للإرسال الفعلي
 * - FROM_EMAIL — اختياري (افتراضي: noreply@olympiad.local)
 *
 * وضع الاختبار: { "test": true } + JWT ولي أمر — يرسل لحساب المتصل فقط
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type WeeklySummary = {
  pointsSum: number;
  present: number;
  absent: number;
  examCount: number;
};

type ChildSummary = {
  full_name: string;
  grade: string;
  class_name: string;
  summary: WeeklySummary;
};

function buildWeekRange() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return {
    weekAgo,
    since: weekAgo.toISOString().slice(0, 10),
  };
}

async function buildStudentWeeklySummary(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
): Promise<WeeklySummary> {
  const { weekAgo, since } = buildWeekRange();

  const [pointsRes, attRes, examRes] = await Promise.all([
    supabase
      .from('points_ledger')
      .select('points')
      .eq('student_id', studentId)
      .eq('status', 'approved')
      .gte('created_at', weekAgo.toISOString()),
    supabase
      .from('attendance')
      .select('status')
      .eq('student_id', studentId)
      .gte('date', since),
    supabase
      .from('exam_results')
      .select('score, max_score')
      .eq('student_id', studentId)
      .gte('submitted_at', weekAgo.toISOString()),
  ]);

  const pointsSum = (pointsRes.data ?? []).reduce((s, r) => s + Number(r.points), 0);
  const att = attRes.data ?? [];
  const present = att.filter((a) => a.status === 'present' || a.status === 'late').length;
  const absent = att.filter((a) => a.status === 'absent').length;

  return {
    pointsSum,
    present,
    absent,
    examCount: (examRes.data ?? []).length,
  };
}

function buildEmailHtml(parentName: string, children: ChildSummary[]): string {
  const weekLabel = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const childBlocks = children
    .map(
      (c) => `
      <div style="background:#1a2744;border:1px solid #2a3f66;border-radius:12px;padding:16px;margin-bottom:16px;">
        <h3 style="margin:0 0 8px;color:#F4C430;font-size:16px;">${c.full_name}</h3>
        <p style="margin:0 0 12px;color:#94a3b8;font-size:13px;">${c.grade} — فصل ${c.class_name}</p>
        <table style="width:100%;border-collapse:collapse;text-align:center;">
          <tr>
            <td style="padding:8px;background:#2a2410;border-radius:8px;">
              <div style="font-size:22px;font-weight:bold;color:#F4C430;">${c.summary.pointsSum}</div>
              <div style="font-size:11px;color:#94a3b8;">نقطة معتمدة</div>
            </td>
            <td style="width:8px;"></td>
            <td style="padding:8px;background:#0f2a1a;border-radius:8px;">
              <div style="font-size:22px;font-weight:bold;color:#27AE60;">${c.summary.present}</div>
              <div style="font-size:11px;color:#94a3b8;">حضور · ${c.summary.absent} غياب</div>
            </td>
            <td style="width:8px;"></td>
            <td style="padding:8px;background:#1f1533;border-radius:8px;">
              <div style="font-size:22px;font-weight:bold;color:#a78bfa;">${c.summary.examCount}</div>
              <div style="font-size:11px;color:#94a3b8;">اختبار</div>
            </td>
          </tr>
        </table>
      </div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D1B2A;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#F4C430;margin:0;font-size:22px;">أولمبياد النخبة</h1>
      <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">ملخص الأسبوع — ${weekLabel}</p>
    </div>
    <p style="color:#e2e8f0;font-size:15px;margin-bottom:20px;">مرحباً ${parentName}،</p>
    <p style="color:#94a3b8;font-size:14px;margin-bottom:20px;">إليك ملخص أسبوع ابنك/أبنائك في المنصة:</p>
    ${childBlocks}
    <p style="color:#64748b;font-size:12px;text-align:center;margin-top:24px;">
      يمكنك إلغاء الاشتراك من لوحة ولي الأمر في المنصة.<br>
      أولمبياد النخبة 1448 هـ
    </p>
  </div>
</body>
</html>`;
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  apiKey: string,
  fromEmail: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${body}` };
  }
  return { ok: true };
}

async function digestForParent(
  supabase: ReturnType<typeof createClient>,
  parent: { id: string; email: string; full_name: string },
  resendKey: string,
  fromEmail: string,
): Promise<{ sent: boolean; error?: string }> {
  const { data: children, error: childErr } = await supabase
    .from('students')
    .select('id, full_name, grade, class_name')
    .eq('parent_id', parent.id)
    .eq('is_active', true);

  if (childErr) return { sent: false, error: childErr.message };
  if (!children?.length) return { sent: false, error: 'لا يوجد أبناء مرتبطون' };

  const summaries: ChildSummary[] = [];
  for (const child of children) {
    const summary = await buildStudentWeeklySummary(supabase, child.id);
    summaries.push({
      full_name: child.full_name,
      grade: child.grade,
      class_name: child.class_name,
      summary,
    });
  }

  const html = buildEmailHtml(parent.full_name, summaries);
  const subject = 'ملخص أسبوعي — أولمبياد النخبة';
  const result = await sendViaResend(parent.email, subject, html, resendKey, fromEmail);
  return result.ok ? { sent: true } : { sent: false, error: result.error };
}

function isServiceRoleRequest(req: Request, serviceRoleKey: string): boolean {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  return token === serviceRoleKey;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'Olympiad <noreply@olympiad.local>';

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: { test?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const isTest = body.test === true;
    const authHeader = req.headers.get('Authorization');

    if (!resendKey) {
      return new Response(
        JSON.stringify({
          error: 'RESEND_API_KEY غير مُعدّ — أضف المفتاح في إعدادات Edge Functions ثم أعد النشر',
          sent: 0,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let parentIds: string[] = [];

    if (isTest) {
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

      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .eq('id', caller.id)
        .single();

      if (profile?.role !== 'parent' && !['admin', 'activity_leader'].includes(profile?.role ?? '')) {
        return new Response(JSON.stringify({ error: 'متاح لولي الأمر أو الإدارة فقط' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      parentIds = [caller.id];
    } else {
      if (!isServiceRoleRequest(req, serviceRoleKey)) {
        return new Response(JSON.stringify({ error: 'يتطلب مفتاح service role للتشغيل المجدول' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: parents, error: parentsErr } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'parent')
        .eq('weekly_email_opt_in', true)
        .eq('is_active', true);

      if (parentsErr) throw parentsErr;
      parentIds = (parents ?? []).map((p) => p.id);
    }

    if (parentIds.length === 0) {
      return new Response(
        JSON.stringify({ message: 'لا يوجد أولياء أمور مشتركون', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: parentRows, error: rowsErr } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .in('id', parentIds);

    if (rowsErr) throw rowsErr;

    let sent = 0;
    const errors: string[] = [];

    for (const parent of parentRows ?? []) {
      const result = await digestForParent(supabaseAdmin, parent, resendKey, fromEmail);
      if (result.sent) {
        sent += 1;
      } else if (result.error) {
        errors.push(`${parent.email}: ${result.error}`);
      }
    }

    const message = isTest
      ? sent > 0
        ? 'تم إرسال البريد التجريبي بنجاح'
        : errors[0] ?? 'لم يُرسل البريد'
      : `تم إرسال ${sent} من ${parentRows?.length ?? 0} بريداً`;

    return new Response(
      JSON.stringify({
        message,
        sent,
        total: parentRows?.length ?? 0,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
