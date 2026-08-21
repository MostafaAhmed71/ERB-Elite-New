/**
 * jobs-worker — يعالج مهام platform_jobs (Phase C)
 *
 * استدعاء:
 * - service_role: معالجة دفعة من الطابور (cron / يدوي)
 * - JWT لمطور المنصة: نفس المعالجة بعد التحقق من الدور
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

type JobRow = {
  id: string;
  job_type: string;
  payload: Record<string, unknown> | null;
  attempts: number;
};

async function reportJobFailure(
  admin: ReturnType<typeof createClient>,
  job: JobRow,
  errorMsg: string,
) {
  try {
    await admin.rpc('report_platform_error', {
      p_source: 'job',
      p_message: `Job failed: ${job.job_type} — ${errorMsg}`.slice(0, 4000),
      p_severity: 'error',
      p_stack: null,
      p_context: {
        job_type: job.job_type,
        attempts: job.attempts,
        possible_cause: 'فشلت مهمة خلفية — راجع /dev/jobs ونوع المهمة.',
        error_name: 'JobFailure',
      },
      p_url: null,
      p_user_agent: 'jobs-worker',
      p_job_id: job.id,
      p_session_id: null,
      p_request_id: `job_${job.id.slice(0, 8)}_${Date.now().toString(36)}`,
      p_route: null,
      p_fingerprint: `job:${job.job_type}:${errorMsg.slice(0, 100)}`,
    });
  } catch {
    /* لا نُفشل العامل بسبب تسجيل الخطأ */
  }
}

function normalizePhoneDigits(phone: string): string {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('05')) p = '966' + p.slice(1);
  else if (p.startsWith('5') && p.length === 9) p = '966' + p;
  return p;
}

async function getWhatsAppApiBase(admin: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await admin
    .from('academic_config')
    .select('value')
    .eq('key', 'whatsapp_api_url')
    .maybeSingle();
  const raw = data?.value as unknown;
  let url = '';
  if (typeof raw === 'string') url = raw;
  else if (raw != null) url = String(raw).replace(/^"|"$/g, '');
  url = url.trim().replace(/\/$/, '');
  return url || 'https://wpp.northelite0.com';
}

async function isWhatsAppSendEnabled(admin: ReturnType<typeof createClient>): Promise<boolean> {
  const { data } = await admin
    .from('school_settings')
    .select('value')
    .eq('key', 'platform_system_flags')
    .maybeSingle();
  const flags = (data?.value ?? {}) as Record<string, unknown>;
  if (flags.whatsapp_send_enabled === false) return false;
  return true;
}

async function resolveReminderTeachers(
  admin: ReturnType<typeof createClient>,
  kind: string,
): Promise<{ id: string; full_name: string; phone: string }[]> {
  const { data: teachers, error } = await admin
    .from('users')
    .select('id, full_name, phone')
    .eq('role', 'teacher')
    .eq('is_active', true);
  if (error) throw error;
  const list = (teachers ?? []).filter((t) => t.phone?.trim()) as {
    id: string;
    full_name: string;
    phone: string;
  }[];

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });

  if (kind === 'homework' || kind === 'academic') {
    const { data: homeworks } = await admin
      .from('academic_homeworks')
      .select('teacher_id')
      .eq('date', today);
    const done = new Set((homeworks ?? []).map((h) => h.teacher_id as string));
    return list.filter((t) => !done.has(t.id));
  }

  // general / custom / other → كل المعلمين ذوي رقم
  return list;
}

function buildReminderMessage(kind: string, teacherName: string, customBody?: string): string {
  if (customBody?.trim()) {
    return customBody
      .split('{name}').join(teacherName)
      .split('{الاسم}').join(teacherName);
  }
  const today = new Date().toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' });
  if (kind === 'homework' || kind === 'academic') {
    return (
      `السلام عليكم ${teacherName}،\n\n` +
      `تذكير من إدارة المدرسة:\n` +
      `يرجى إدخال *الواجب المنزلي* لتاريخ ${today} عبر تطبيق الشؤون الأكاديمية.\n\n` +
      `شكراً لتعاونكم`
    );
  }
  if (kind === 'weekly_plan') {
    return (
      `السلام عليكم ${teacherName}،\n\n` +
      `تذكير من إدارة المدرسة:\n` +
      `يرجى إكمال *الخطة الأسبوعية* من التطبيق في أقرب وقت.\n\n` +
      `شكراً لتعاونكم`
    );
  }
  return (
    `السلام عليكم ${teacherName}،\n\n` +
    `تذكير من إدارة المدرسة — يرجى متابعة التطبيق.\n\n` +
    `شكراً لتعاونكم`
  );
}

async function processWhatsAppReminderJob(
  admin: ReturnType<typeof createClient>,
  job: JobRow,
): Promise<{ ok: boolean; result?: Record<string, unknown>; error?: string }> {
  const payload = job.payload ?? {};
  const dryRun = payload.dry_run === true;
  const kind = String(
    payload.kind ?? (job.job_type === 'academic_reminder' ? 'homework' : 'general'),
  );
  const customBody = typeof payload.message === 'string' ? payload.message : undefined;

  let teachers: { id: string; full_name: string; phone: string }[] = [];
  const rawTargets = Array.isArray(payload.targets) ? payload.targets : [];
  if (rawTargets.length > 0) {
    teachers = rawTargets
      .map((t) => {
        const row = t as Record<string, unknown>;
        const phone = String(row.phone ?? '').trim();
        if (!phone) return null;
        return {
          id: String(row.id ?? phone),
          full_name: String(row.full_name ?? row.name ?? 'زميلنا'),
          phone,
        };
      })
      .filter(Boolean) as { id: string; full_name: string; phone: string }[];
  } else {
    try {
      teachers = await resolveReminderTeachers(admin, kind);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  const messages = teachers.map((t) => ({
    phone: normalizePhoneDigits(t.phone),
    message: buildReminderMessage(kind, t.full_name || 'زميلنا', customBody),
    teacher_id: t.id,
  }));

  if (dryRun) {
    return {
      ok: true,
      result: {
        dry_run: true,
        kind,
        target_count: messages.length,
        sample: messages.slice(0, 3).map((m) => ({ phone: m.phone, teacher_id: m.teacher_id })),
        note: 'Dry-run: حُسبت الأهداف دون إرسال',
      },
    };
  }

  const enabled = await isWhatsAppSendEnabled(admin);
  if (!enabled) {
    return {
      ok: false,
      error: 'whatsapp_send_enabled=false في platform_system_flags',
    };
  }

  const apiBase = await getWhatsAppApiBase(admin);
  try {
    const statusRes = await fetch(`${apiBase}/status`, { signal: AbortSignal.timeout(8000) });
    if (!statusRes.ok) {
      return { ok: false, error: `WhatsApp status HTTP ${statusRes.status}` };
    }
    const status = await statusRes.json() as { connected?: boolean; status?: string };
    if (!(status.connected || status.status === 'connected')) {
      return { ok: false, error: `واتساب غير متصل (${status.status ?? 'unknown'})` };
    }
  } catch (e) {
    return { ok: false, error: `تعذّر الاتصال بواتساب: ${e instanceof Error ? e.message : String(e)}` };
  }

  if (messages.length === 0) {
    return {
      ok: true,
      result: { dry_run: false, kind, sent: 0, failed: 0, note: 'لا مستلمين' },
    };
  }

  try {
    const res = await fetch(`${apiBase}/send-bulk-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({ phone: m.phone, message: m.message })),
      }),
      signal: AbortSignal.timeout(180000),
    });
    const body = await res.json().catch(() => ({})) as {
      sent?: number;
      failed?: number;
      report?: unknown[];
      error?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: body.error || `WhatsApp send-bulk HTTP ${res.status}`,
      };
    }
    return {
      ok: true,
      result: {
        dry_run: false,
        kind,
        api_base: apiBase,
        target_count: messages.length,
        sent: body.sent ?? messages.length,
        failed: body.failed ?? 0,
        report_sample: Array.isArray(body.report) ? body.report.slice(0, 5) : [],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function processJob(
  admin: ReturnType<typeof createClient>,
  job: JobRow,
): Promise<{ ok: boolean; result?: Record<string, unknown>; error?: string }> {
  const type = job.job_type;

  if (type === 'ping') {
    return {
      ok: true,
      result: {
        pong: true,
        at: new Date().toISOString(),
        payload: job.payload ?? {},
        attempt: job.attempts,
      },
    };
  }

  if (type === 'health_check') {
    const [{ count: usersCount }, { count: jobsQueued }] = await Promise.all([
      admin.from('users').select('*', { count: 'exact', head: true }),
      admin.from('platform_jobs').select('*', { count: 'exact', head: true }).in('status', ['queued', 'retrying']),
    ]);
    return {
      ok: true,
      result: {
        checked_at: new Date().toISOString(),
        users_approx: usersCount ?? 0,
        jobs_waiting: jobsQueued ?? 0,
      },
    };
  }

  // تنبيه فوري لمطور المنصة عند خطأ مستخدم
  if (type === 'dev_whatsapp_alert') {
    const payload = job.payload ?? {};
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return { ok: false, error: 'Supabase secrets missing' };
    }
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/dev-error-whatsapp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error_id: payload.error_id,
          phone: payload.phone,
          message: payload.message,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          error: `dev-error-whatsapp ${res.status}: ${JSON.stringify(body).slice(0, 300)}`,
        };
      }
      return { ok: true, result: { invoked: 'dev-error-whatsapp', response: body } };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  // Wave 5 N — تذكير واتساب: الحي افتراضي؛ dry_run=true للتجربة فقط
  if (type === 'whatsapp_reminder' || type === 'academic_reminder') {
    return await processWhatsAppReminderJob(admin, job);
  }

  if (type === 'parent_digest') {
    const payload = job.payload ?? {};
    const dryRun = payload.dry_run === true;
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!dryRun && supabaseUrl && serviceKey) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/weekly-parent-digest`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dry_run: false, source: 'jobs-worker', job_id: job.id }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            ok: false,
            error: `weekly-parent-digest failed: ${res.status} ${JSON.stringify(body).slice(0, 300)}`,
          };
        }
        return {
          ok: true,
          result: { dry_run: false, invoked: 'weekly-parent-digest', response: body },
        };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }

    return {
      ok: true,
      result: {
        at: new Date().toISOString(),
        dry_run: dryRun,
        note: dryRun
          ? 'Dry-run لملخص أولياء — أزل dry_run أو مرّر dry_run:false للإرسال'
          : 'تعذّر الاستدعاء — تحقق من Secrets',
      },
    };
  }

  return { ok: false, error: `نوع مهمة غير مدعوم بعد: ${type}` };
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
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json(401, { error: 'Authorization required' });

    const admin = createClient(supabaseUrl, serviceKey);
    const isService = token === serviceKey;

    if (!isService) {
      const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData.user) return json(401, { error: 'Invalid token' });

      const { data: profile } = await admin
        .from('users')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profile?.role !== 'platform_developer') {
        return json(403, { error: 'platform_developer only' });
      }
    }

    let limit = 5;
    let runTick = true;
    try {
      const body = req.method === 'POST' ? await req.json() : {};
      if (typeof body?.limit === 'number') limit = body.limit;
      if (body?.tick === false) runTick = false;
    } catch {
      /* empty body ok */
    }

    let scheduleTick: unknown = null;
    if (runTick) {
      try {
        const { data: tickData } = await admin.rpc('tick_platform_schedules', { p_limit: 20 });
        scheduleTick = tickData;
      } catch {
        /* الجدول قد لا يكون مطبّقاً بعد */
      }
    }

    const workerId = `edge-jobs-worker:${crypto.randomUUID().slice(0, 8)}`;
    const { data: claimed, error: claimErr } = await admin.rpc('claim_platform_jobs', {
      p_worker_id: workerId,
      p_limit: limit,
    });

    if (claimErr) return json(500, { error: claimErr.message });

    const jobs = (claimed ?? []) as JobRow[];
    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const job of jobs) {
      try {
        const outcome = await processJob(admin, job);
        const { error: completeErr } = await admin.rpc('complete_platform_job', {
          p_job_id: job.id,
          p_ok: outcome.ok,
          p_result: outcome.result ?? null,
          p_error: outcome.error ?? null,
          p_progress: outcome.ok ? 100 : 0,
        });
        if (completeErr) {
          results.push({ id: job.id, ok: false, error: completeErr.message });
          await reportJobFailure(admin, job, completeErr.message);
        } else {
          results.push({ id: job.id, ok: outcome.ok, error: outcome.error });
          if (!outcome.ok && outcome.error) {
            await reportJobFailure(admin, job, outcome.error);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await admin.rpc('complete_platform_job', {
          p_job_id: job.id,
          p_ok: false,
          p_result: null,
          p_error: msg,
          p_progress: 0,
        });
        await reportJobFailure(admin, job, msg);
        results.push({ id: job.id, ok: false, error: msg });
      }
    }

    return json(200, {
      ok: true,
      worker_id: workerId,
      claimed: jobs.length,
      schedule_tick: scheduleTick,
      results,
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
