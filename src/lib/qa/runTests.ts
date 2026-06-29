import { supabase } from '../supabase';
import type { UserRole } from '../../types';
import { canRoleAccessRoute, UNIQUE_QA_ROUTES, type QaRouteEntry } from './catalog';

export type TestStatus = 'pass' | 'fail' | 'warn' | 'skip' | 'running' | 'idle';

export interface QaTestResult {
  id: string;
  group: string;
  name: string;
  status: TestStatus;
  message: string;
  durationMs?: number;
  details?: string;
}

export interface QaRunSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  durationMs: number;
}

const EDGE_FUNCTIONS = [
  'create-user',
  'register-user',
  'admin-update-user',
  'delete-user',
  'bulk-create-class-accounts',
  'create-staff-invite',
  'accept-staff-invite',
] as const;

const TABLE_READS: { table: string; label: string }[] = [
  { table: 'students', label: 'الطلاب' },
  { table: 'users', label: 'المستخدمون' },
  { table: 'activities', label: 'الأنشطة' },
  { table: 'points_ledger', label: 'سجل النقاط' },
  { table: 'class_points_ledger', label: 'نقاط الفصول' },
  { table: 'attendance', label: 'الحضور' },
  { table: 'exams', label: 'الاختبارات' },
  { table: 'questions', label: 'بنك الأسئلة' },
  { table: 'exam_results', label: 'نتائج الاختبارات' },
  { table: 'school_settings', label: 'إعدادات البرنامج' },
  { table: 'notifications', label: 'الإشعارات' },
  { table: 'comp_classes', label: 'فصول المسابقة' },
  { table: 'comp_questions', label: 'أسئلة المسابقة' },
  { table: 'comp_scores', label: 'نقاط المسابقة' },
];

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  const result = await fn();
  return { result, ms: Math.round(performance.now() - start) };
}

function envCheck(): QaTestResult[] {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const appUrl = import.meta.env.VITE_APP_URL;
  const leaderboardMock = import.meta.env.VITE_LEADERBOARD_MOCK;

  const results: QaTestResult[] = [
    {
      id: 'env-VITE_SUPABASE_URL',
      group: 'البيئة',
      name: 'VITE_SUPABASE_URL',
      status: supabaseUrl ? 'pass' : 'fail',
      message: supabaseUrl ? 'معرّف' : 'مطلوب — أضفه في .env',
      details: supabaseUrl ? String(supabaseUrl).slice(0, 40) + '…' : undefined,
    },
    {
      id: 'env-VITE_SUPABASE_ANON_KEY',
      group: 'البيئة',
      name: 'VITE_SUPABASE_ANON_KEY',
      status: supabaseKey ? 'pass' : 'fail',
      message: supabaseKey ? 'معرّف' : 'مطلوب — أضفه في .env',
      details: supabaseKey ? '••••••••' : undefined,
    },
    {
      id: 'env-VITE_APP_URL',
      group: 'البيئة',
      name: 'VITE_APP_URL',
      status: appUrl ? 'pass' : 'warn',
      message: appUrl
        ? 'معرّف — يُستخدم في روابط QR'
        : 'غير معرّف — يُستخدم localhost تلقائياً في التطوير',
      details: appUrl ?? (typeof window !== 'undefined' ? window.location.origin : undefined),
    },
    {
      id: 'env-VITE_LEADERBOARD_MOCK',
      group: 'البيئة',
      name: 'VITE_LEADERBOARD_MOCK',
      status:
        leaderboardMock === 'true' ? 'warn' : 'pass',
      message:
        leaderboardMock === 'true'
          ? 'مفعّل — عطّله قبل النشر (false)'
          : leaderboardMock === 'false' || leaderboardMock === undefined
            ? 'معطّل — مناسب للإنتاج'
            : `القيمة: ${leaderboardMock}`,
      details: leaderboardMock ?? 'false (افتراضي)',
    },
  ];

  return results;
}

async function authCheck(role: UserRole | null): Promise<QaTestResult[]> {
  const results: QaTestResult[] = [];

  const { result: sessionRes, ms } = await timed(() => supabase.auth.getSession());
  const session = sessionRes.data.session;

  results.push({
    id: 'auth-session',
    group: 'المصادقة',
    name: 'جلسة نشطة',
    status: session ? 'pass' : 'fail',
    message: session ? `مسجّل: ${session.user.email}` : 'لا توجد جلسة — سجّل الدخول أولاً',
    durationMs: ms,
  });

  results.push({
    id: 'auth-role',
    group: 'المصادقة',
    name: 'دور المستخدم',
    status: role ? 'pass' : 'fail',
    message: role ? `الدور: ${role}` : 'لم يُحدَّد الدور',
  });

  if (session) {
    const { result: profileRes, ms: profileMs } = await timed(async () =>
      supabase.from('users').select('id, role, full_name').eq('id', session.user.id).maybeSingle()
    );
    const profile = profileRes.data;
    const err = profileRes.error;

    results.push({
      id: 'auth-profile',
      group: 'المصادقة',
      name: 'ملف المستخدم في DB',
      status: err ? 'fail' : profile ? 'pass' : 'warn',
      message: err
        ? err.message
        : profile
          ? `${profile.full_name} (${profile.role})`
          : 'لا يوجد صف في public.users',
      durationMs: profileMs,
    });
  }

  return results;
}

async function tableReadChecks(): Promise<QaTestResult[]> {
  const results: QaTestResult[] = [];

  for (const { table, label } of TABLE_READS) {
    const { result, ms } = await timed(async () =>
      supabase.from(table).select('*', { count: 'exact', head: true })
    );

    results.push({
      id: `table-${table}`,
      group: 'قاعدة البيانات',
      name: `قراءة ${label}`,
      status: result.error ? 'fail' : 'pass',
      message: result.error
        ? result.error.message
        : `OK — ${result.count ?? 0} صف`,
      durationMs: ms,
    });
  }

  return results;
}

async function edgeFunctionChecks(): Promise<QaTestResult[]> {
  const results: QaTestResult[] = [];

  for (const fn of EDGE_FUNCTIONS) {
    const { result, ms } = await timed(async () =>
      supabase.functions.invoke(fn, { body: { __qa_probe: true } })
    );

    const networkFail =
      result.error &&
      /failed to fetch|network|function not found|404|functions/i.test(result.error.message ?? '');

    results.push({
      id: `edge-${fn}`,
      group: 'Edge Functions',
      name: fn,
      status: networkFail ? 'fail' : 'pass',
      message: networkFail
        ? `غير منشورة أو غير متاحة: ${result.error?.message}`
        : 'الدالة تستجيب (منشورة)',
      durationMs: ms,
    });
  }

  return results;
}

async function realtimeCheck(): Promise<QaTestResult> {
  return new Promise((resolve) => {
    const start = performance.now();
    const timeout = setTimeout(() => {
      void supabase.removeChannel(channel);
      resolve({
        id: 'realtime-points',
        group: 'Realtime',
        name: 'اشتراك points_ledger',
        status: 'warn',
        message: 'لم يتأكد الاشتراك خلال 5 ثوانٍ — تحقق من إعدادات Realtime',
        durationMs: Math.round(performance.now() - start),
      });
    }, 5000);

    const channel = supabase
      .channel('qa-realtime-probe')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'points_ledger' }, () => {})
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          void supabase.removeChannel(channel);
          resolve({
            id: 'realtime-points',
            group: 'Realtime',
            name: 'اشتراك points_ledger',
            status: 'pass',
            message: 'متصل بـ Realtime',
            durationMs: Math.round(performance.now() - start),
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          void supabase.removeChannel(channel);
          resolve({
            id: 'realtime-points',
            group: 'Realtime',
            name: 'اشتراك points_ledger',
            status: 'fail',
            message: `فشل الاشتراك: ${status}`,
            durationMs: Math.round(performance.now() - start),
          });
        }
      });
  });
}

function routeAccessChecks(role: UserRole | null): QaTestResult[] {
  return UNIQUE_QA_ROUTES.map((entry) => {
    const access = canRoleAccessRoute(role, entry);
    const expectedForRole =
      access === 'allowed' || access === 'public' || (access === 'auth-only' && role);

    return {
      id: `route-${entry.id}`,
      group: 'صلاحيات المسارات',
      name: entry.label,
      status: expectedForRole ? 'pass' : role ? 'skip' : 'warn',
      message: expectedForRole
        ? `مسموح — ${entry.path}`
        : `محظور لدورك (${role}) — ${entry.path}`,
      details: entry.notes,
    };
  });
}

async function scenarioApiChecks(): Promise<QaTestResult[]> {
  const results: QaTestResult[] = [];

  const { result: pendingPoints, ms: pMs } = await timed(async () =>
    supabase.from('points_ledger').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  );
  results.push({
    id: 'scenario-pending-points',
    group: 'سيناريوهات API',
    name: 'نقاط معلّقة للاعتماد',
    status: pendingPoints.error ? 'fail' : 'pass',
    message: pendingPoints.error
      ? pendingPoints.error.message
      : `${pendingPoints.count ?? 0} نقطة معلّقة`,
    durationMs: pMs,
  });

  const { result: activeExams, ms: eMs } = await timed(async () =>
    supabase.from('exams').select('id', { count: 'exact', head: true }).eq('is_active', true)
  );
  results.push({
    id: 'scenario-active-exams',
    group: 'سيناريوهات API',
    name: 'اختبارات نشطة',
    status: activeExams.error ? 'fail' : 'pass',
    message: activeExams.error
      ? activeExams.error.message
      : `${activeExams.count ?? 0} اختبار نشط`,
    durationMs: eMs,
  });

  const { result: students, ms: sMs } = await timed(async () =>
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true)
  );
  results.push({
    id: 'scenario-students',
    group: 'سيناريوهات API',
    name: 'طلاب نشطون',
    status: students.error ? 'fail' : (students.count ?? 0) > 0 ? 'pass' : 'warn',
    message: students.error
      ? students.error.message
      : students.count === 0
        ? 'لا يوجد طلاب — ارفع بيانات تجريبية'
        : `${students.count} طالب نشط`,
    durationMs: sMs,
  });

  const { result: compQ, ms: cMs } = await timed(async () =>
    supabase.from('comp_questions').select('id', { count: 'exact', head: true })
  );
  results.push({
    id: 'scenario-comp',
    group: 'سيناريوهات API',
    name: 'المسابقة اليومية (DB)',
    status: compQ.error ? 'warn' : 'pass',
    message: compQ.error
      ? 'جداول comp_* غير مُطبَّقة بعد'
      : `${compQ.count ?? 0} سؤال — الواجهة غير منفّذة بعد`,
    durationMs: cMs,
  });

  return results;
}

export type QaTestGroup =
  | 'all'
  | 'env'
  | 'auth'
  | 'tables'
  | 'edge'
  | 'realtime'
  | 'routes'
  | 'scenarios';

export async function runQaTests(
  role: UserRole | null,
  groups: QaTestGroup[] = ['all'],
  onProgress?: (result: QaTestResult) => void
): Promise<{ results: QaTestResult[]; summary: QaRunSummary }> {
  const start = performance.now();
  const results: QaTestResult[] = [];
  const run = (group: QaTestGroup) => groups.includes('all') || groups.includes(group);

  const push = (items: QaTestResult | QaTestResult[]) => {
    const list = Array.isArray(items) ? items : [items];
    for (const item of list) {
      results.push(item);
      onProgress?.(item);
    }
  };

  if (run('env')) push(envCheck());
  if (run('auth')) push(await authCheck(role));
  if (run('tables')) push(await tableReadChecks());
  if (run('edge')) push(await edgeFunctionChecks());
  if (run('realtime')) push(await realtimeCheck());
  if (run('routes')) push(routeAccessChecks(role));
  if (run('scenarios')) push(await scenarioApiChecks());

  const summary: QaRunSummary = {
    total: results.length,
    passed: results.filter((r) => r.status === 'pass').length,
    failed: results.filter((r) => r.status === 'fail').length,
    warnings: results.filter((r) => r.status === 'warn').length,
    skipped: results.filter((r) => r.status === 'skip').length,
    durationMs: Math.round(performance.now() - start),
  };

  return { results, summary };
}

export function groupResultsByGroup(results: QaTestResult[]): Record<string, QaTestResult[]> {
  return results.reduce<Record<string, QaTestResult[]>>((acc, r) => {
    if (!acc[r.group]) acc[r.group] = [];
    acc[r.group].push(r);
    return acc;
  }, {});
}

export function filterRoutesByCategory(
  routes: QaRouteEntry[],
  category: string | 'all',
  role: UserRole | null,
  accessFilter: 'all' | 'allowed' | 'denied'
) {
  return routes.filter((r) => {
    if (category !== 'all' && r.category !== category) return false;
    const access = canRoleAccessRoute(role, r);
    if (accessFilter === 'allowed' && access === 'denied') return false;
    if (accessFilter === 'denied' && access !== 'denied') return false;
    return true;
  });
}
