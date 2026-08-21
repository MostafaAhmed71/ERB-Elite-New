/**
 * تشخيص أخطاء المنصة — رسائل آمنة، IDs، سبب محتمل، وتنسيق تنبيهات غنية.
 * لا يُنتج أبداً النص الحرفي "[object Object]".
 */

import type { PlatformErrorSeverity, PlatformErrorSource } from './platformErrors';

const CORRELATION_KEY = 'erb_err_correlation_id';
const SESSION_KEY = 'erb_err_session_id';

export type NormalizedError = {
  name: string;
  message: string;
  stack: string | null;
  stackShort: string | null;
};

export type ApiRequestMeta = {
  endpoint: string;
  method: string;
  params: Record<string, string>;
  query: string;
  host: string;
  fullUrl: string;
};

export type SeverityTier = 'Critical' | 'High' | 'Medium' | 'Low';

/** عرض الشدة للمطور/واتساب (بدل warning فقط) */
export const SEVERITY_TIER: Record<PlatformErrorSeverity, SeverityTier> = {
  critical: 'Critical',
  error: 'High',
  warning: 'Medium',
  info: 'Low',
};

export const SEVERITY_TIER_AR: Record<PlatformErrorSeverity, string> = {
  critical: 'حرج (Critical)',
  error: 'عالٍ (High)',
  warning: 'متوسط (Medium)',
  info: 'منخفض (Low)',
};

function isUseless(msg: string | undefined | null): boolean {
  if (!msg) return true;
  const t = msg.trim();
  return (
    !t
    || t === '{}'
    || t === 'null'
    || t === 'undefined'
    || t === '[object Object]'
    || /^\[object \w+]$/i.test(t)
  );
}

/** stringify آمن لا يُرجع [object Object] */
export function safeStringify(value: unknown, max = 800): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    return isUseless(value) ? '' : value.slice(0, max);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Error) {
    return (value.message && !isUseless(value.message) ? value.message : value.name || 'Error').slice(0, max);
  }
  try {
    const s = JSON.stringify(value);
    if (!s || s === '{}' || s === 'null') return '';
    return s.slice(0, max);
  } catch {
    return '';
  }
}

export function shortenStack(stack: string | null | undefined, maxLines = 6, maxChars = 900): string | null {
  if (!stack || isUseless(stack)) return null;
  const lines = stack
    .split('\n')
    .map((l) => l.trimEnd())
    .filter(Boolean)
    .slice(0, maxLines);
  const out = lines.join('\n').slice(0, maxChars);
  return out || null;
}

/** استخراج اسم + رسالة + stack مختصر من أي قيمة */
export function normalizeUnknownError(err: unknown, fallback = 'حدث خطأ غير متوقع'): NormalizedError {
  if (err == null) {
    return { name: 'Unknown', message: fallback, stack: null, stackShort: null };
  }

  if (typeof err === 'string') {
    const message = isUseless(err) ? fallback : err.trim().slice(0, 2000);
    return { name: 'Error', message, stack: null, stackShort: null };
  }

  if (err instanceof Error) {
    const name = err.name || 'Error';
    const message = !isUseless(err.message)
      ? err.message.trim().slice(0, 2000)
      : fallback;
    const stack = err.stack ? err.stack.slice(0, 8000) : null;
    return { name, message, stack, stackShort: shortenStack(stack) };
  }

  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const name =
      (typeof o.name === 'string' && o.name) ||
      (typeof o.code === 'string' && o.code) ||
      (typeof o.status === 'number' && `HTTP${o.status}`) ||
      'ObjectError';

    let message = '';
    for (const key of ['message', 'error_description', 'error', 'details', 'hint', 'msg'] as const) {
      const v = o[key];
      if (typeof v === 'string' && !isUseless(v)) {
        message = v.trim();
        break;
      }
      if (v && typeof v === 'object') {
        const nested = normalizeUnknownError(v, '');
        if (nested.message && nested.message !== fallback) {
          message = nested.message;
          break;
        }
      }
    }

    if (!message) {
      const serialized = safeStringify(err, 600);
      message = serialized || fallback;
    }

    const stackRaw =
      typeof o.stack === 'string'
        ? o.stack
        : typeof (o as { stackTrace?: string }).stackTrace === 'string'
          ? (o as { stackTrace: string }).stackTrace
          : null;

    return {
      name: String(name).slice(0, 120),
      message: message.slice(0, 2000),
      stack: stackRaw ? stackRaw.slice(0, 8000) : null,
      stackShort: shortenStack(stackRaw),
    };
  }

  const asStr = String(err);
  return {
    name: typeof err,
    message: isUseless(asStr) ? fallback : asStr.slice(0, 2000),
    stack: null,
    stackShort: null,
  };
}

export function getOrCreateCorrelationId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = sessionStorage.getItem(CORRELATION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(CORRELATION_KEY, id);
      sessionStorage.setItem(SESSION_KEY, id);
    } else {
      sessionStorage.setItem(CORRELATION_KEY, id);
    }
    return id;
  } catch {
    return `c_${Date.now().toString(36)}`;
  }
}

export function createRequestId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `r_${Date.now().toString(36)}_${rand}`;
}

export function parseFetchArgs(args: Parameters<typeof fetch>): {
  url: string;
  method: string;
  meta: ApiRequestMeta;
} {
  const raw = args[0];
  const init = args[1];
  const url =
    typeof raw === 'string'
      ? raw
      : raw instanceof Request
        ? raw.url
        : String(raw ?? '');
  const method = (
    init?.method ||
    (raw instanceof Request ? raw.method : 'GET') ||
    'GET'
  ).toUpperCase();

  return { url, method, meta: extractApiMeta(url, method) };
}

export function extractApiMeta(url: string, method = 'GET'): ApiRequestMeta {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://local');
    const params: Record<string, string> = {};
    u.searchParams.forEach((v, k) => {
      try {
        params[decodeURIComponent(k)] = decodeURIComponent(v);
      } catch {
        params[k] = v;
      }
    });
    // PostgREST filters غالباً في المسار/الكويري — فك تشفير الكويري كاملاً
    let query = '';
    try {
      query = decodeURIComponent(u.search || '');
    } catch {
      query = u.search || '';
    }
    return {
      endpoint: u.pathname,
      method: method.toUpperCase(),
      params,
      query: query.slice(0, 500),
      host: u.host,
      fullUrl: `${u.origin}${u.pathname}${u.search}`.slice(0, 800),
    };
  } catch {
    return {
      endpoint: url.slice(0, 280),
      method: method.toUpperCase(),
      params: {},
      query: '',
      host: '',
      fullUrl: url.slice(0, 800),
    };
  }
}

export async function readResponseBodySnippet(res: Response, max = 600): Promise<string | null> {
  try {
    const clone = res.clone();
    const text = await clone.text();
    if (!text || isUseless(text)) return null;
    return text.slice(0, max);
  } catch {
    return null;
  }
}

/** تحليل أولي لتسريع التشخيص */
export function inferPossibleCause(input: {
  message: string;
  source?: PlatformErrorSource | string;
  status?: number | null;
  name?: string;
  context?: Record<string, unknown>;
}): string {
  const msg = (input.message || '').toLowerCase();
  const name = (input.name || '').toLowerCase();
  const source = String(input.source || '');
  const status = input.status ?? (typeof input.context?.status === 'number' ? input.context.status : null);
  const type = String(input.context?.type ?? '');

  if (status === 401 || /jwt|unauthorized|session_not_found|not authenticated/i.test(msg)) {
    return 'انتهت الجلسة أو التوكن غير صالح — أعد تسجيل الدخول وتحقق من Auth.';
  }
  if (status === 403 || /row-level security|42501|forbidden|permission/i.test(msg)) {
    return 'مشكلة صلاحيات (RLS/دور) — راجع دور المستخدم وسياسات الجدول.';
  }
  if (status === 404 || type === 'http_4xx' && status === 404) {
    return 'المسار أو المورد غير موجود — تحقق من Endpoint والـ slug والـ migrations.';
  }
  if (status === 409 || /duplicate key|23505|already exists/i.test(msg)) {
    return 'تعارض بيانات (تكرار مفتاح فريد) — تحقق من القيود والقيم المُرسلة.';
  }
  if (status === 429 || /rate limit|too many/i.test(msg)) {
    return 'تم تجاوز حد الطلبات — خفّف الإرسال أو ارفع الحصة.';
  }
  if (status != null && status >= 502) {
    return 'بوابة/خادم غير متاح (502+) — تحقق من Edge Function أو الاستضافة.';
  }
  if (status != null && status >= 500) {
    return 'عطل خادم داخلي (5xx) — راجع سجلات Edge/Supabase للطلب المرتبط.';
  }
  if (/failed to fetch|networkerror|load failed|network request failed|offline/i.test(msg)) {
    return 'فشل شبكة أو CORS — تحقق من الاتصال وعنوان API وCORS.';
  }
  if (/timeout|timed out|abort/i.test(msg) || name.includes('abort')) {
    return 'انتهت مهلة الطلب — الخادم بطيء أو الشبكة ضعيفة.';
  }
  if (source === 'ai' || /openai|anthropic|tokens|credit/i.test(msg)) {
    return 'مشكلة مزوّد AI أو رصيد/مفتاح API — راجع إعدادات AI والاستخدام.';
  }
  if (source === 'whatsapp' || /whatsapp|wpp\./i.test(msg)) {
    return 'واتساب غير متصل أو فشل send-text — راجع /dev/monitor/whatsapp.';
  }
  if (source === 'realtime' || /realtime|channel|websocket/i.test(msg)) {
    return 'انقطاع Realtime — تحقق من القنوات والاشتراكات وصلاحيات الجداول.';
  }
  if (source === 'storage' || /bucket|storage|upload/i.test(msg)) {
    return 'مشكلة تخزين/رفع ملفات — راجع الـ bucket والسياسات.';
  }
  if (type === 'resource_error') {
    return 'فشل تحميل مورد ثابت (صورة/سكربت) — تحقق من المسار وCDN.';
  }
  if (type === 'react_query') {
    return 'فشل استعلام/طفرة React Query — راجع الـ queryKey والاستجابة من API.';
  }
  if (/react render|componentstack|minmax|undefined is not/i.test(msg) || input.context?.boundary) {
    return 'عطل واجهة React — راجع المكوّن في الـ stack وبيانات الحالة.';
  }
  if (source === 'job' || /job failed/i.test(msg)) {
    return 'فشلت مهمة خلفية — راجع /dev/jobs ونوع المهمة وعدد المحاولات.';
  }
  if (source === 'database' || /postgres|pgrst|22p02|42703/i.test(msg)) {
    return 'خطأ قاعدة بيانات/PostgREST — راجع الـ schema والـ RPC والأعمدة.';
  }
  return 'سبب غير محدد بعد — افتح صفحة الـ Incident وراجع الـ stack والسياق وRequest ID.';
}

export function getDashboardBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_APP_URL as string | undefined)?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

export function incidentDashboardUrl(errorId: string): string {
  const base = getDashboardBaseUrl();
  return `${base}/dev/errors?id=${encodeURIComponent(errorId)}`;
}

export type AlertBuildInput = {
  id: string;
  message: string;
  source?: string | null;
  severity?: string | null;
  user_name?: string | null;
  user_role?: string | null;
  user_phone?: string | null;
  route_path?: string | null;
  stack?: string | null;
  context?: Record<string, unknown> | null;
  occurrence_count?: number | null;
  session_id?: string | null;
  request_id?: string | null;
  correlation_id?: string | null;
  created_at?: string | null;
  last_seen_at?: string | null;
};

/** نص واتساب مختصر وغني للتشخيص */
export function buildDevErrorAlertMessage(err: AlertBuildInput): string {
  const sevRaw = (err.severity || 'error') as PlatformErrorSeverity;
  const sevLabel =
    SEVERITY_TIER_AR[sevRaw] ||
    SEVERITY_TIER[sevRaw] ||
    String(err.severity || '—');
  const ctx = (err.context ?? {}) as Record<string, unknown>;
  const occ = err.occurrence_count ?? 1;
  const correlation =
    err.correlation_id ||
    (typeof ctx.correlation_id === 'string' ? ctx.correlation_id : null) ||
    err.session_id ||
    '—';
  const requestId =
    err.request_id ||
    (typeof ctx.request_id === 'string' ? ctx.request_id : null) ||
    '—';
  const possibleCause =
    (typeof ctx.possible_cause === 'string' && ctx.possible_cause) ||
    inferPossibleCause({
      message: err.message,
      source: err.source || undefined,
      status: typeof ctx.status === 'number' ? ctx.status : null,
      name: typeof ctx.error_name === 'string' ? ctx.error_name : undefined,
      context: ctx,
    });

  const lines: string[] = [
    '🚨 Incident — ERB Elite',
    '',
    `الشدة: ${sevLabel}`,
    `التكرارات: ×${occ}`,
    `المستخدم: ${err.user_name || 'زائر/غير معروف'}${err.user_role ? ` (${err.user_role})` : ''}`,
    `جوال: ${err.user_phone || 'غير مسجّل'}`,
    `المشكلة: ${String(err.message || '—').slice(0, 400)}`,
  ];

  if (ctx.error_name) {
    lines.push(`اسم الخطأ: ${String(ctx.error_name).slice(0, 80)}`);
  }

  lines.push(`المصدر: ${err.source || '—'}`);
  lines.push(`المسار: ${err.route_path || '—'}`);

  if (ctx.endpoint || ctx.method || ctx.status) {
    lines.push('');
    lines.push('— API —');
    if (ctx.method || ctx.endpoint) {
      lines.push(`${ctx.method || 'GET'} ${String(ctx.endpoint || ctx.url || '—').slice(0, 200)}`);
    }
    if (ctx.status != null) lines.push(`HTTP Status: ${ctx.status}`);
    if (ctx.params && typeof ctx.params === 'object') {
      const p = safeStringify(ctx.params, 280);
      if (p) lines.push(`Parameters: ${p}`);
    } else if (typeof ctx.query === 'string' && ctx.query) {
      lines.push(`Parameters: ${ctx.query.slice(0, 280)}`);
    }
    if (typeof ctx.response_body === 'string' && ctx.response_body) {
      lines.push(`Response: ${ctx.response_body.slice(0, 280)}`);
    }
  }

  lines.push('');
  lines.push(`Possible Cause: ${possibleCause.slice(0, 280)}`);

  const stackShort =
    (typeof ctx.stack_short === 'string' && ctx.stack_short) ||
    shortenStack(err.stack);
  if (stackShort) {
    lines.push('');
    lines.push('Stack:');
    lines.push(stackShort.slice(0, 500));
  }

  lines.push('');
  lines.push(`Request ID: ${requestId}`);
  lines.push(`Correlation ID: ${correlation}`);
  lines.push(
    `الوقت: ${new Date(err.last_seen_at || err.created_at || Date.now()).toLocaleString('ar-SA', {
      timeZone: 'Asia/Riyadh',
    })}`,
  );
  lines.push('');
  lines.push(`لوحة التحكم: ${incidentDashboardUrl(err.id)}`);

  return lines.join('\n');
}
