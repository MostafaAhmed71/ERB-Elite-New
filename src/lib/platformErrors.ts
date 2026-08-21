import { supabase } from './supabase';
import {
  buildDevErrorAlertMessage,
  createRequestId,
  extractApiMeta,
  getOrCreateCorrelationId,
  inferPossibleCause,
  normalizeUnknownError,
  parseFetchArgs,
  readResponseBodySnippet,
  SEVERITY_TIER_AR,
  shortenStack,
  type SeverityTier,
} from './errorDiagnostics';

export type PlatformErrorSource =
  | 'frontend'
  | 'backend'
  | 'edge'
  | 'api'
  | 'ai'
  | 'whatsapp'
  | 'database'
  | 'storage'
  | 'job'
  | 'ocr'
  | 'auth'
  | 'realtime'
  | 'other';

/** القيم المخزّنة في DB — تُعرض كـ Critical / High / Medium / Low */
export type PlatformErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export type PlatformErrorStatus = 'new' | 'investigating' | 'fixed' | 'ignored';

export type PlatformError = {
  id: string;
  source: PlatformErrorSource;
  severity: PlatformErrorSeverity;
  message: string;
  stack: string | null;
  context: Record<string, unknown>;
  url: string | null;
  user_agent: string | null;
  user_id: string | null;
  job_id: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  status?: PlatformErrorStatus;
  resolution_notes?: string | null;
  fingerprint?: string | null;
  occurrence_count?: number;
  last_seen_at?: string;
  user_name?: string | null;
  user_role?: string | null;
  user_phone?: string | null;
  route_path?: string | null;
  browser?: string | null;
  os_name?: string | null;
  device_type?: string | null;
  session_id?: string | null;
  request_id?: string | null;
  correlation_id?: string | null;
};

export type PlatformErrorAnalytics = {
  window_hours: number;
  total_events: number;
  unique_errors: number;
  active: number;
  critical_active: number;
  affected_users: number;
  by_source: Record<string, number>;
  by_route: Array<{ route: string; cnt: number }>;
  top_messages: Array<{ message: string; cnt: number; severity: string }>;
  top_users: Array<{ user_name: string; user_role: string | null; errors: number; events: number }>;
  daily_rate: Array<{ day: string; cnt: number }>;
  job_success_rate_pct?: number | null;
  avg_job_duration_ms?: number | null;
};

export type ReportPlatformErrorResult = {
  id: string | null;
  is_new: boolean;
  occurrence_count: number;
  should_alert: boolean;
};

export const ERROR_SOURCE_LABELS: Record<PlatformErrorSource, string> = {
  frontend: 'واجهة',
  backend: 'خادم',
  edge: 'Edge',
  api: 'API',
  ai: 'AI',
  whatsapp: 'واتساب',
  database: 'قاعدة البيانات',
  storage: 'تخزين',
  job: 'مهمة',
  ocr: 'OCR',
  auth: 'مصادقة',
  realtime: 'Realtime',
  other: 'أخرى',
};

/** Critical / High / Medium / Low */
export const ERROR_SEVERITY_LABELS: Record<PlatformErrorSeverity, string> = {
  critical: SEVERITY_TIER_AR.critical,
  error: SEVERITY_TIER_AR.error,
  warning: SEVERITY_TIER_AR.warning,
  info: SEVERITY_TIER_AR.info,
};

export const ERROR_SEVERITY_TIER: Record<PlatformErrorSeverity, SeverityTier> = {
  critical: 'Critical',
  error: 'High',
  warning: 'Medium',
  info: 'Low',
};

export const ERROR_STATUS_LABELS: Record<PlatformErrorStatus, string> = {
  new: 'جديد',
  investigating: 'قيد التحقيق',
  fixed: 'تم الإصلاح',
  ignored: 'متجاهل',
};

function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
  const device = /Mobile|Android|iPhone|iPad/i.test(ua)
    ? /iPad|Tablet/i.test(ua)
      ? 'tablet'
      : 'mobile'
    : 'desktop';

  let browser = 'Other';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  let os = 'Other';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return { browser, os, device };
}

function currentRoute(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.pathname}${window.location.search}`.slice(0, 500);
}

function parseReportRpcResult(data: unknown): ReportPlatformErrorResult {
  if (data == null) {
    return { id: null, is_new: false, occurrence_count: 0, should_alert: false };
  }
  // توافق مع RPC القديم (UUID نصّي)
  if (typeof data === 'string') {
    return { id: data, is_new: true, occurrence_count: 1, should_alert: true };
  }
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const id = o.id != null ? String(o.id) : null;
    return {
      id,
      is_new: Boolean(o.is_new),
      occurrence_count: Number(o.occurrence_count ?? 1),
      should_alert: Boolean(o.should_alert),
    };
  }
  return { id: null, is_new: false, occurrence_count: 0, should_alert: false };
}

/** تقرير خفيف — لا يرمي؛ لا يحجب UX */
export async function reportPlatformError(input: {
  source: PlatformErrorSource;
  message: string;
  severity?: PlatformErrorSeverity;
  stack?: string;
  context?: Record<string, unknown>;
  url?: string;
  jobId?: string;
  requestId?: string;
  correlationId?: string;
  route?: string;
  fingerprint?: string;
  errorName?: string;
}): Promise<string | null> {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const parsed = ua ? parseUserAgent(ua) : { browser: '', os: '', device: '' };
    const route = input.route ?? currentRoute();
    const correlationId = input.correlationId ?? getOrCreateCorrelationId();
    const requestId = input.requestId ?? createRequestId();
    const normalizedMsg = normalizeUnknownError(input.message).message;
    const stackShort = shortenStack(input.stack);

    let userPhone: string | undefined;
    try {
      const { useAuthStore } = await import('../stores/authStore');
      const phone = useAuthStore.getState().user?.phone;
      if (phone) userPhone = String(phone);
    } catch {
      /* store قد لا يكون جاهزاً */
    }

    const possibleCause = inferPossibleCause({
      message: normalizedMsg,
      source: input.source,
      status: typeof input.context?.status === 'number' ? input.context.status : null,
      name: input.errorName,
      context: input.context,
    });

    const context: Record<string, unknown> = {
      ...(input.context ?? {}),
      browser: parsed.browser || undefined,
      os: parsed.os || undefined,
      device_type: parsed.device || undefined,
      ...(userPhone ? { user_phone: userPhone } : {}),
      request_id: requestId,
      correlation_id: correlationId,
      possible_cause: possibleCause,
      ...(input.errorName ? { error_name: input.errorName } : {}),
      ...(stackShort ? { stack_short: stackShort } : {}),
    };

    const { data, error } = await supabase.rpc('report_platform_error', {
      p_source: input.source,
      p_message: normalizedMsg.slice(0, 4000),
      p_severity: input.severity ?? 'error',
      p_stack: input.stack ?? null,
      p_context: context,
      p_url: input.url ?? (typeof window !== 'undefined' ? window.location.href : null),
      p_user_agent: ua || null,
      p_job_id: input.jobId ?? null,
      p_session_id: correlationId,
      p_request_id: requestId,
      p_route: route || null,
      p_fingerprint: input.fingerprint ?? null,
      p_correlation_id: correlationId,
    });
    if (error) {
      // توافق: RPC بدون p_correlation_id
      if (error.message?.includes('p_correlation_id') || error.message?.includes('correlation')) {
        const retry = await supabase.rpc('report_platform_error', {
          p_source: input.source,
          p_message: normalizedMsg.slice(0, 4000),
          p_severity: input.severity ?? 'error',
          p_stack: input.stack ?? null,
          p_context: context,
          p_url: input.url ?? (typeof window !== 'undefined' ? window.location.href : null),
          p_user_agent: ua || null,
          p_job_id: input.jobId ?? null,
          p_session_id: correlationId,
          p_request_id: requestId,
          p_route: route || null,
          p_fingerprint: input.fingerprint ?? null,
        });
        if (retry.error) {
          console.warn('[platformErrors] report failed', retry.error.message);
          return null;
        }
        const legacy = parseReportRpcResult(retry.data);
        if (legacy.id && legacy.should_alert && (input.severity ?? 'error') !== 'info') {
          void import('./devAlertSettings')
            .then(({ notifyDevWhatsAppForError }) => notifyDevWhatsAppForError(legacy.id))
            .catch(() => undefined);
        }
        return legacy.id;
      }
      console.warn('[platformErrors] report failed', error.message);
      return null;
    }

    const result = parseReportRpcResult(data);
    // تنبيه واتساب فقط لـ Incident جديد أو عند عتبة تكرار (should_alert من DB)
    if (result.id && result.should_alert && (input.severity ?? 'error') !== 'info') {
      void import('./devAlertSettings')
        .then(({ notifyDevWhatsAppForError }) => notifyDevWhatsAppForError(result.id))
        .catch(() => undefined);
    }
    return result.id;
  } catch (e) {
    console.warn('[platformErrors] report exception', e);
    return null;
  }
}

/** اختصار للخدمات (AI / WhatsApp / OCR / Jobs…) */
export function reportServiceError(
  source: PlatformErrorSource,
  err: unknown,
  extra?: {
    severity?: PlatformErrorSeverity;
    context?: Record<string, unknown>;
    jobId?: string;
    requestId?: string;
  },
): void {
  const normalized = normalizeUnknownError(err, 'service error');
  void reportPlatformError({
    source,
    message: normalized.message,
    severity: extra?.severity ?? 'error',
    stack: normalized.stack ?? undefined,
    context: {
      ...(extra?.context ?? {}),
      error_name: normalized.name,
      stack_short: normalized.stackShort,
    },
    jobId: extra?.jobId,
    requestId: extra?.requestId,
    errorName: normalized.name,
  });
}

export async function listPlatformErrors(opts?: {
  source?: PlatformErrorSource | 'all';
  status?: PlatformErrorStatus | 'active' | 'all';
  severity?: PlatformErrorSeverity | 'all';
  /** عند التعيين يتجاهل severity المفرد — لفلتر الجودة (warning+info) */
  severities?: PlatformErrorSeverity[];
  search?: string;
  openOnly?: boolean;
  limit?: number;
  id?: string;
}): Promise<PlatformError[]> {
  let q = supabase
    .from('platform_errors')
    .select('*')
    .order('last_seen_at', { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.id) {
    q = q.eq('id', opts.id);
  }
  if (opts?.source && opts.source !== 'all') {
    q = q.eq('source', opts.source);
  }
  if (opts?.severities?.length) {
    q = q.in('severity', opts.severities);
  } else if (opts?.severity && opts.severity !== 'all') {
    q = q.eq('severity', opts.severity);
  }
  if (opts?.status === 'active' || opts?.openOnly) {
    q = q.in('status', ['new', 'investigating']);
  } else if (opts?.status && opts.status !== 'all') {
    q = q.eq('status', opts.status);
  }
  if (opts?.search?.trim()) {
    q = q.ilike('message', `%${opts.search.trim().slice(0, 80)}%`);
  }

  const { data, error } = await q;
  if (error) {
    if (error.message?.includes('last_seen_at') || error.message?.includes('status')) {
      let q2 = supabase
        .from('platform_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(opts?.limit ?? 100);
      if (opts?.source && opts.source !== 'all') q2 = q2.eq('source', opts.source);
      if (opts?.openOnly || opts?.status === 'active') q2 = q2.is('resolved_at', null);
      if (opts?.id) q2 = q2.eq('id', opts.id);
      const res = await q2;
      if (res.error) throw res.error;
      return (res.data ?? []) as PlatformError[];
    }
    throw error;
  }
  return (data ?? []) as PlatformError[];
}

export async function getPlatformErrorById(id: string): Promise<PlatformError | null> {
  const rows = await listPlatformErrors({ id, status: 'all', limit: 1 });
  return rows[0] ?? null;
}

export async function getPlatformErrorStats(): Promise<{
  open: number;
  critical: number;
  mildOpen: number;
  last24h: number;
  total: number;
  affectedUsers: number;
}> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('platform_errors')
    .select('id, severity, resolved_at, created_at, status, last_seen_at, user_id, occurrence_count');
  if (error) throw error;
  const rows = data ?? [];
  const isOpen = (r: (typeof rows)[0]) =>
    r.status ? ['new', 'investigating'].includes(r.status) : !r.resolved_at;
  const users = new Set(rows.filter((r) => r.user_id && isOpen(r)).map((r) => r.user_id));
  return {
    total: rows.length,
    open: rows.filter(isOpen).length,
    critical: rows.filter((r) => isOpen(r) && r.severity === 'critical').length,
    mildOpen: rows.filter(
      (r) => isOpen(r) && (r.severity === 'warning' || r.severity === 'info'),
    ).length,
    last24h: rows.filter((r) => (r.last_seen_at ?? r.created_at) >= since).length,
    affectedUsers: users.size,
  };
}

export async function fetchPlatformErrorAnalytics(hours = 24): Promise<PlatformErrorAnalytics | null> {
  const { data, error } = await supabase.rpc('platform_error_analytics', { p_hours: hours });
  if (error) {
    console.warn('[platformErrors] analytics', error.message);
    return null;
  }
  return data as PlatformErrorAnalytics;
}

export async function updatePlatformErrorStatus(
  id: string,
  status: PlatformErrorStatus,
  notes?: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_platform_error_status', {
    p_error_id: id,
    p_status: status,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  return !!data;
}

export async function resolvePlatformError(id: string): Promise<boolean> {
  return updatePlatformErrorStatus(id, 'fixed');
}

/** تنبيه واتساب حي لمطور المنصة (يدوي من لوحة الأخطاء) */
export async function enqueueCriticalErrorWhatsAppAlert(errorId: string, message: string): Promise<void> {
  try {
    const { notifyDevWhatsAppForError } = await import('./devAlertSettings');
    await notifyDevWhatsAppForError(errorId);
    const { enqueuePlatformJob } = await import('./platformJobs');
    await enqueuePlatformJob(
      'dev_whatsapp_alert',
      {
        dry_run: false,
        reason: 'critical_platform_error',
        error_id: errorId,
        preview: String(message).slice(0, 280),
      },
      5,
    );
  } catch (e) {
    console.warn('[platformErrors] whatsapp alert enqueue failed', e);
  }
}

export { buildDevErrorAlertMessage };

let listenersInstalled = false;

const mildThrottle = new Map<string, number>();
const MILD_THROTTLE_MS = 45_000;

function shouldThrottleMild(key: string): boolean {
  const now = Date.now();
  const prev = mildThrottle.get(key) ?? 0;
  if (now - prev < MILD_THROTTLE_MS) return true;
  mildThrottle.set(key, now);
  if (mildThrottle.size > 200) {
    const cutoff = now - MILD_THROTTLE_MS * 2;
    for (const [k, t] of mildThrottle) {
      if (t < cutoff) mildThrottle.delete(k);
    }
  }
  return false;
}

/** أخطاء بسيطة/جودة — واتساب فقط إذا تجاوزت عتبة DB (عادة لا) */
export function reportMildIssue(input: {
  message: string;
  source?: PlatformErrorSource;
  severity?: 'info' | 'warning';
  context?: Record<string, unknown>;
  fingerprint?: string;
  error?: unknown;
}): void {
  const fromErr = input.error != null ? normalizeUnknownError(input.error) : null;
  const message = normalizeUnknownError(input.message || fromErr?.message || '').message;
  if (!message) return;
  const kind = String(input.context?.type ?? 'mild');
  const fp = input.fingerprint ?? `mild:${kind}:${message.slice(0, 120)}`;
  if (shouldThrottleMild(fp)) return;
  void reportPlatformError({
    source: input.source ?? 'frontend',
    severity: input.severity ?? 'warning',
    message,
    stack: fromErr?.stack ?? undefined,
    context: {
      ...(input.context ?? {}),
      ...(fromErr ? { error_name: fromErr.name, stack_short: fromErr.stackShort } : {}),
    },
    fingerprint: fp,
    errorName: fromErr?.name,
  });
}

function shouldSkipMonitorUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes('report_platform_error')
    || u.includes('dev-error-whatsapp')
    || u.includes('platform_errors')
    || u.includes('/rest/v1/rpc/report_platform')
  );
}

/** تسجيل أخطاء الواجهة تلقائياً قبل بلاغ المستخدم — آمن للاستدعاء مرة واحدة من main */
export function installPlatformErrorListeners() {
  if (typeof window === 'undefined' || listenersInstalled) return;
  listenersInstalled = true;

  window.addEventListener('error', (event) => {
    const isResource = event.target && event.target !== window;
    if (isResource) {
      const el = event.target as HTMLElement & { src?: string; href?: string };
      const src = el.src || el.href || '';
      if (!src || shouldSkipMonitorUrl(src)) return;
      void reportPlatformError({
        source: 'frontend',
        severity: 'warning',
        message: `فشل تحميل مورد: ${String(src).slice(0, 300)}`,
        context: { type: 'resource_error', tag: el.tagName },
      });
      return;
    }

    const normalized = normalizeUnknownError(event.error ?? event.message, 'window.error');
    void reportPlatformError({
      source: 'frontend',
      message: normalized.message,
      severity: 'error',
      stack: normalized.stack ?? undefined,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error_name: normalized.name,
        stack_short: normalized.stackShort,
      },
      errorName: normalized.name,
    });
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const normalized = normalizeUnknownError(reason, 'unhandledrejection');
    const lower = normalized.message.toLowerCase();
    let source: PlatformErrorSource = 'frontend';
    if (lower.includes('auth') || lower.includes('jwt') || lower.includes('session')) source = 'auth';
    else if (lower.includes('realtime') || lower.includes('channel')) source = 'realtime';
    else if (lower.includes('storage') || lower.includes('bucket')) source = 'storage';
    else if (lower.includes('postgres') || lower.includes('pgrst') || lower.includes('database')) {
      source = 'database';
    } else if (lower.includes('fetch') || lower.includes('network') || lower.includes('failed to fetch')) {
      source = 'api';
    }

    void reportPlatformError({
      source,
      message: normalized.message,
      severity: 'error',
      stack: normalized.stack ?? undefined,
      context: {
        type: 'unhandledrejection',
        error_name: normalized.name,
        stack_short: normalized.stackShort,
      },
      errorName: normalized.name,
    });
  });

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const { url, method, meta } = parseFetchArgs(args);
    const requestId = createRequestId();

    try {
      const res = await originalFetch(...args);
      if (!url || shouldSkipMonitorUrl(url) || url.includes('localhost')) {
        return res;
      }

      if (res.status >= 400 && res.status !== 401 && res.status !== 403) {
        const responseBody = await readResponseBodySnippet(res, 600);
        const apiMeta = {
          type: res.status >= 500 ? 'fetch_status' : 'http_4xx',
          endpoint: meta.endpoint,
          method,
          params: meta.params,
          query: meta.query,
          status: res.status,
          response_body: responseBody,
          host: meta.host,
        };

        if (res.status >= 500) {
          void reportPlatformError({
            source: url.includes('/functions/v1/') ? 'edge' : 'api',
            severity: res.status >= 502 ? 'critical' : 'error',
            message: `HTTP ${res.status} ${method} ${meta.endpoint || url.slice(0, 200)}`,
            requestId,
            context: apiMeta,
            fingerprint: `http:${res.status}:${method}:${meta.endpoint.slice(0, 160)}`,
          });
        } else {
          reportMildIssue({
            source: url.includes('/functions/v1/') ? 'edge' : 'api',
            severity: res.status === 404 ? 'info' : 'warning',
            message: `HTTP ${res.status} ${method} ${meta.endpoint || url.slice(0, 200)}`,
            context: apiMeta,
            fingerprint: `http4:${res.status}:${method}:${meta.endpoint.slice(0, 160)}`,
          });
        }
      }
      return res;
    } catch (err) {
      if (url && !shouldSkipMonitorUrl(url)) {
        const normalized = normalizeUnknownError(err, 'فشل شبكة');
        const metaFallback = extractApiMeta(url, method);
        void reportPlatformError({
          source: 'api',
          severity: 'error',
          message: `${normalized.message} — ${method} ${metaFallback.endpoint || url.slice(0, 160)}`,
          stack: normalized.stack ?? undefined,
          requestId,
          context: {
            type: 'fetch_network',
            endpoint: metaFallback.endpoint,
            method,
            params: metaFallback.params,
            query: metaFallback.query,
            error_name: normalized.name,
            stack_short: normalized.stackShort,
          },
          errorName: normalized.name,
          fingerprint: `net:${method}:${metaFallback.endpoint.slice(0, 160)}:${normalized.message.slice(0, 80)}`,
        });
      }
      throw err;
    }
  };
}
