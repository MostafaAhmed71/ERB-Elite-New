/**
 * dev-error-whatsapp — إرسال تنبيه واتساب فوري لمطور المنصة
 * يُستدعى من: pg_net / الواجهة / jobs-worker
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, prefer, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('05')) p = '966' + p.slice(1);
  else if (p.startsWith('5') && p.length === 9) p = '966' + p;
  return p;
}

function isUseless(msg: string | undefined | null): boolean {
  if (!msg) return true;
  const t = msg.trim();
  return !t || t === '{}' || t === '[object Object]' || /^\[object \w+]$/i.test(t);
}

function safeText(value: unknown, max = 400): string {
  if (value == null) return '';
  if (typeof value === 'string') return isUseless(value) ? '' : value.slice(0, max);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    const s = JSON.stringify(value);
    if (!s || s === '{}' || s === 'null') return '';
    return s.slice(0, max);
  } catch {
    return '';
  }
}

function severityLabel(sev: string | null | undefined): string {
  switch (sev) {
    case 'critical':
      return 'حرج (Critical)';
    case 'error':
      return 'عالٍ (High)';
    case 'warning':
      return 'متوسط (Medium)';
    case 'info':
      return 'منخفض (Low)';
    default:
      return sev || '—';
  }
}

function shortenStack(stack: string | null | undefined, max = 500): string {
  if (!stack || isUseless(stack)) return '';
  return stack
    .split('\n')
    .map((l) => l.trimEnd())
    .filter(Boolean)
    .slice(0, 6)
    .join('\n')
    .slice(0, max);
}

function dashboardUrl(
  errorId: string,
  cfg: Record<string, unknown>,
  errUrl: string | null | undefined,
): string {
  let base = String(cfg.dashboard_base_url ?? '').trim().replace(/\/$/, '');
  if (!base && errUrl && /^https?:\/\//i.test(errUrl)) {
    try {
      base = new URL(errUrl).origin;
    } catch {
      /* ignore */
    }
  }
  if (!base) return `/dev/errors?id=${errorId}`;
  return `${base}/dev/errors?id=${errorId}`;
}

function buildRichAlert(err: Record<string, unknown>, cfg: Record<string, unknown>, userPhone: string): string {
  const ctx = (err.context && typeof err.context === 'object'
    ? err.context
    : {}) as Record<string, unknown>;
  const occ = Number(err.occurrence_count ?? 1);
  const message = safeText(err.message, 400) || '—';
  const correlation =
    safeText(err.correlation_id, 80) ||
    safeText(ctx.correlation_id, 80) ||
    safeText(err.session_id, 80) ||
    '—';
  const requestId =
    safeText(err.request_id, 80) ||
    safeText(ctx.request_id, 80) ||
    '—';
  const cause =
    safeText(ctx.possible_cause, 280) ||
    'سبب غير محدد بعد — افتح صفحة الـ Incident.';
  const stack =
    safeText(ctx.stack_short, 500) ||
    shortenStack(typeof err.stack === 'string' ? err.stack : null);

  const lines: string[] = [
    '🚨 Incident — ERB Elite',
    '',
    `الشدة: ${severityLabel(String(err.severity ?? ''))}`,
    `التكرارات: ×${occ}`,
    `المستخدم: ${safeText(err.user_name, 80) || 'زائر/غير معروف'}${
      err.user_role ? ` (${String(err.user_role)})` : ''
    }`,
    `جوال: ${userPhone}`,
    `المشكلة: ${message}`,
  ];

  if (ctx.error_name) {
    lines.push(`اسم الخطأ: ${safeText(ctx.error_name, 80)}`);
  }

  lines.push(`المصدر: ${String(err.source || '—')}`);
  lines.push(`المسار: ${safeText(err.route_path, 120) || '—'}`);

  if (ctx.endpoint || ctx.method || ctx.status != null) {
    lines.push('');
    lines.push('— API —');
    lines.push(
      `${safeText(ctx.method, 12) || 'GET'} ${
        safeText(ctx.endpoint, 200) || safeText(ctx.url, 200) || '—'
      }`,
    );
    if (ctx.status != null) lines.push(`HTTP Status: ${ctx.status}`);
    const params = safeText(ctx.params, 280) || safeText(ctx.query, 280);
    if (params) lines.push(`Parameters: ${params}`);
    const body = safeText(ctx.response_body, 280);
    if (body) lines.push(`Response: ${body}`);
  }

  lines.push('');
  lines.push(`Possible Cause: ${cause}`);

  if (stack) {
    lines.push('');
    lines.push('Stack:');
    lines.push(stack);
  }

  lines.push('');
  lines.push(`Request ID: ${requestId}`);
  lines.push(`Correlation ID: ${correlation}`);
  lines.push(
    `الوقت: ${new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}`,
  );
  lines.push('');
  lines.push(
    `لوحة التحكم: ${dashboardUrl(String(err.id), cfg, typeof err.url === 'string' ? err.url : null)}`,
  );

  return lines.join('\n');
}

async function getWhatsAppApiBase(admin: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await admin
    .from('academic_config')
    .select('value')
    .eq('key', 'whatsapp_api_url')
    .maybeSingle();
  const raw = data?.value as unknown;
  let url = typeof raw === 'string' ? raw : raw != null ? String(raw).replace(/^"|"$/g, '') : '';
  url = url.trim().replace(/\/$/, '');
  // تجنب [object Object] كعنوان API
  if (!url || isUseless(url) || !/^https?:\/\//i.test(url)) {
    return 'https://wpp.northelite0.com';
  }
  return url;
}

async function loadAlertConfig(admin: ReturnType<typeof createClient>): Promise<{
  enabled: boolean;
  phone: string;
  cfg: Record<string, unknown>;
}> {
  const { data } = await admin
    .from('school_settings')
    .select('value')
    .eq('key', 'platform_dev_alerts')
    .maybeSingle();
  const cfg = (data?.value ?? {}) as Record<string, unknown>;
  return {
    enabled: cfg.enabled !== false,
    phone: normalizePhone(String(cfg.whatsapp_phone ?? '')),
    cfg,
  };
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

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const isService = token === serviceKey;

    if (!isService) {
      const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData.user) return json(401, { error: 'Invalid token' });
    }

    const body = await req.json().catch(() => ({})) as {
      error_id?: string;
      phone?: string;
      message?: string;
    };

    const alerts = await loadAlertConfig(admin);
    const phone = normalizePhone(body.phone || alerts.phone);
    if (!alerts.enabled) return json(200, { ok: false, skipped: 'alerts disabled' });
    if (phone.length < 9) {
      return json(200, {
        ok: false,
        skipped: 'no_phone',
        hint: 'احفظ رقم واتساب المطور من /dev/errors أو Feature Flags',
      });
    }

    let message = typeof body.message === 'string' ? body.message.trim() : '';
    // أعد بناء الرسالة الغنية دائماً عند وجود error_id (حتى لو وُجدت رسالة قديمة فقيرة)
    if (body.error_id) {
      const { data: err } = await admin
        .from('platform_errors')
        .select(
          'id, message, source, severity, stack, context, url, user_name, user_role, user_phone, user_id, route_path, session_id, request_id, correlation_id, occurrence_count, created_at, last_seen_at',
        )
        .eq('id', body.error_id)
        .maybeSingle();

      if (err) {
        let userPhone = String((err as { user_phone?: string | null }).user_phone ?? '').trim();
        if (!userPhone && err.user_id) {
          const { data: u } = await admin
            .from('users')
            .select('phone')
            .eq('id', err.user_id)
            .maybeSingle();
          userPhone = String(u?.phone ?? '').trim();
        }
        if (!userPhone) userPhone = 'غير مسجّل';

        message = buildRichAlert(err as Record<string, unknown>, alerts.cfg, userPhone);
      }
    }

    if (!message || isUseless(message)) {
      return json(400, { error: 'message or error_id required' });
    }

    const { data: flagsRow } = await admin
      .from('school_settings')
      .select('value')
      .eq('key', 'platform_system_flags')
      .maybeSingle();
    const flags = (flagsRow?.value ?? {}) as Record<string, unknown>;
    if (flags.whatsapp_send_enabled === false) {
      return json(200, { ok: false, skipped: 'whatsapp_send_enabled=false' });
    }

    const apiBase = await getWhatsAppApiBase(admin);
    const statusRes = await fetch(`${apiBase}/status`, { signal: AbortSignal.timeout(8000) });
    if (!statusRes.ok) {
      return json(502, { error: `WhatsApp status HTTP ${statusRes.status}` });
    }
    const status = await statusRes.json() as { connected?: boolean; status?: string };
    if (!(status.connected || status.status === 'connected')) {
      return json(503, { error: `واتساب غير متصل (${status.status ?? 'unknown'})` });
    }

    const sendRes = await fetch(`${apiBase}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
      signal: AbortSignal.timeout(30000),
    });
    const sendBody = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok) {
      return json(502, {
        error: (sendBody as { error?: string }).error || `send-text HTTP ${sendRes.status}`,
      });
    }

    return json(200, { ok: true, phone: phone.slice(0, 5) + '…', api_base: apiBase });
  } catch (e) {
    const msg = e instanceof Error ? e.message : safeText(e, 200) || 'unknown';
    return json(500, { error: msg });
  }
});
