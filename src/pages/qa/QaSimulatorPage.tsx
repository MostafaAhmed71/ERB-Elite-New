import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play,
  RefreshCw,
  ExternalLink,
  Monitor,
  FlaskConical,
  Route,
  ListChecks,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Loader2,
  LogIn,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { ROLE_LABELS } from '../../types';
import { PageHeader, Panel, Button, StatCard, SectionTitle } from '../../components/ui';
import {
  QA_CATEGORY_LABELS,
  QA_DEMO_ACCOUNTS,
  QA_SCENARIOS,
  UNIQUE_QA_ROUTES,
  canRoleAccessRoute,
  type RouteCategory,
} from '../../lib/qa/catalog';
import {
  filterRoutesByCategory,
  groupResultsByGroup,
  runQaTests,
  type QaTestGroup,
  type QaTestResult,
  type TestStatus,
} from '../../lib/qa/runTests';
import clsx from 'clsx';
import toast from 'react-hot-toast';

type TabId = 'screens' | 'tests' | 'scenarios' | 'accounts';

const STATUS_META: Record<
  TestStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  pass: { label: 'ناجح', icon: CheckCircle2, className: 'text-emerald-400' },
  fail: { label: 'فشل', icon: XCircle, className: 'text-red-400' },
  warn: { label: 'تحذير', icon: AlertTriangle, className: 'text-amber-400' },
  skip: { label: 'تخطّي', icon: MinusCircle, className: 'text-white/40' },
  running: { label: 'جاري', icon: Loader2, className: 'text-gold-400 animate-spin' },
  idle: { label: '—', icon: MinusCircle, className: 'text-white/30' },
};

const ACCESS_BADGE: Record<string, { label: string; className: string }> = {
  allowed: { label: 'مسموح', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  public: { label: 'عام', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  denied: { label: 'محظور', className: 'bg-red-500/15 text-red-300 border-red-500/30' },
  'auth-only': { label: 'يتطلب دخول', className: 'bg-gold-500/15 text-gold-300 border-gold-500/30' },
};

function StatusBadge({ status }: { status: TestStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1 text-xs font-medium', meta.className)}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}

function copyText(text: string, label: string) {
  void navigator.clipboard.writeText(text);
  toast.success(`تم نسخ ${label}`);
}

export function QaSimulatorPage() {
  const { role, user } = useAuthStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabId>('screens');
  const [routeCategory, setRouteCategory] = useState<RouteCategory | 'all'>('all');
  const [routeAccessFilter, setRouteAccessFilter] = useState<'all' | 'allowed' | 'denied'>('all');
  const [routeSearch, setRouteSearch] = useState('');

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<QaTestResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
    durationMs: number;
  } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedTestGroups, setSelectedTestGroups] = useState<QaTestGroup[]>(['all']);

  const filteredRoutes = useMemo(() => {
    let list = filterRoutesByCategory(UNIQUE_QA_ROUTES, routeCategory, role, routeAccessFilter);
    if (routeSearch.trim()) {
      const q = routeSearch.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.path.toLowerCase().includes(q) ||
          r.category.includes(q)
      );
    }
    return list;
  }, [routeCategory, routeAccessFilter, routeSearch, role]);

  const groupedResults = useMemo(() => groupResultsByGroup(results), [results]);

  const runTests = useCallback(
    async (groups: QaTestGroup[] = selectedTestGroups) => {
      setTab('tests');
      setRunning(true);
      setResults([]);
      setSummary(null);
      try {
        const { results: next, summary: sum } = await runQaTests(role, groups, (r) => {
          setResults((prev) => [...prev, r]);
        });
        setResults(next);
        setSummary(sum);
        const allGroups = Object.keys(groupResultsByGroup(next));
        setExpandedGroups(Object.fromEntries(allGroups.map((g) => [g, true])));
        if (sum.failed > 0) {
          toast.error(`${sum.failed} اختبار فشل`);
        } else if (sum.warnings > 0) {
          toast(`اكتمل مع ${sum.warnings} تحذير`, { icon: '⚠️' });
        } else {
          toast.success(`نجحت كل الاختبارات (${sum.passed})`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'فشل تشغيل الاختبارات');
      } finally {
        setRunning(false);
      }
    },
    [role, selectedTestGroups]
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'screens', label: 'كل الشاشات', icon: Monitor },
    { id: 'tests', label: 'اختبارات تلقائية', icon: FlaskConical },
    { id: 'scenarios', label: 'سيناريوهات', icon: ListChecks },
    { id: 'accounts', label: 'حسابات تجريبية', icon: LogIn },
  ];

  const testGroupOptions: { id: QaTestGroup; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: 'env', label: 'البيئة' },
    { id: 'auth', label: 'المصادقة' },
    { id: 'tables', label: 'قاعدة البيانات' },
    { id: 'edge', label: 'Edge Functions' },
    { id: 'realtime', label: 'Realtime' },
    { id: 'routes', label: 'صلاحيات المسارات' },
    { id: 'scenarios', label: 'سيناريوهات API' },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="محاكي الاختبار الشامل"
        subtitle="استكشاف كل الشاشات، فحص الاتصال، والتحقق من الصلاحيات قبل النشر"
        icon={FlaskConical}
        actions={
          <Button
            icon={running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            onClick={() => void runTests()}
            loading={running}
            disabled={running}
          >
            تشغيل كل الاختبارات
          </Button>
        }
      />

      <Panel className="p-5 border-gold-500/25 bg-gradient-to-l from-gold-500/10 to-transparent">
        <h2 className="text-lg font-bold text-white mb-3">كيف تستخدم المحاكي؟ (ابدأ من هنا)</h2>
        <ol className="space-y-2 text-sm text-white/75 list-decimal list-inside">
          <li>
            <strong className="text-gold-400">تبويب «كل الشاشات»</strong> — قائمة بكل صفحات الموقع. اضغط{' '}
            <strong>فتح</strong> لزيارة أي شاشة.
          </li>
          <li>
            <strong className="text-gold-400">تبويب «اختبارات تلقائية»</strong> — اضغط الزر الذهبي أعلاه
            لفحص Supabase والصلاحيات. النتائج تظهر هنا (أخضر = ناجح، أحمر = يحتاج إصلاح).
          </li>
          <li>
            <strong className="text-gold-400">تبويب «سيناريوهات»</strong> — خطوات اختبار يدوي (نقاط، اختبارات، حضور…).
          </li>
          <li>
            <strong className="text-gold-400">تبويب «حسابات تجريبية»</strong> — بدّل بين الأدوار (معلم، طالب…) بسجّل
            خروج وادخل بحساب آخر.
          </li>
        </ol>
        <p className="mt-3 text-xs text-white/45">
          التبويب النشط الآن:{' '}
          <span className="text-white/80 font-medium">
            {tabs.find((t) => t.id === tab)?.label ?? '—'}
          </span>
          {running && (
            <span className="mr-2 text-gold-400"> — جاري الفحص… ({results.length} نتيجة حتى الآن)</span>
          )}
        </p>
      </Panel>

      {running && (
        <Panel className="p-4 border-gold-500/30">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="w-5 h-5 text-gold-400 animate-spin shrink-0" />
            <p className="text-sm text-white/80">جاري فحص المنصة… انتظر حتى تظهر النتائج في تبويب «اختبارات تلقائية»</p>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gold-500 transition-all duration-300"
              style={{ width: `${Math.min(95, Math.max(8, results.length * 2))}%` }}
            />
          </div>
          <p className="text-xs text-white/40 mt-2">{results.length} فحص مكتمل — قد يستغرق 15–30 ثانية</p>
        </Panel>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="الشاشات المسجّلة"
          value={UNIQUE_QA_ROUTES.length}
          icon={Route}
          color="from-blue-500 to-blue-600"
          bg="bg-blue-500/10 border-blue-500/20"
        />
        <StatCard
          label="السيناريوهات"
          value={QA_SCENARIOS.length}
          icon={ListChecks}
          color="from-purple-500 to-purple-600"
          bg="bg-purple-500/10 border-purple-500/20"
        />
        <StatCard
          label="دورك الحالي"
          value={role ? ROLE_LABELS[role] : '—'}
          icon={LogIn}
          color="from-gold-400 to-gold-500"
          bg="bg-gold-500/10 border-gold-500/20"
        />
        <StatCard
          label="آخر تشغيل"
          value={summary ? `${summary.passed}/${summary.total}` : '—'}
          icon={FlaskConical}
          color="from-emerald-500 to-emerald-600"
          bg="bg-emerald-500/10 border-emerald-500/20"
        />
      </div>

      {summary && (
        <Panel className="p-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-emerald-400">✓ {summary.passed} ناجح</span>
          <span className="text-red-400">✗ {summary.failed} فشل</span>
          <span className="text-amber-400">⚠ {summary.warnings} تحذير</span>
          <span className="text-white/40">⊘ {summary.skipped} تخطّي</span>
          <span className="text-white/50 mr-auto">{summary.durationMs} مللي ثانية</span>
        </Panel>
      )}

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const showBadge =
            t.id === 'tests' && (running || results.length > 0 || summary != null);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors relative',
                tab === t.id
                  ? 'bg-white/10 text-gold-400 border-b-2 border-gold-400'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {showBadge && (
                <span
                  className={clsx(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    running ? 'bg-gold-500/30 text-gold-200' : 'bg-emerald-500/20 text-emerald-300'
                  )}
                >
                  {running ? '…' : summary ? summary.passed : results.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'screens' && (
        <div className="space-y-4">
          <Panel className="p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-white/50 block mb-1">بحث</label>
              <input
                type="search"
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                placeholder="اسم الشاشة أو المسار..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">الفئة</label>
              <select
                value={routeCategory}
                onChange={(e) => setRouteCategory(e.target.value as RouteCategory | 'all')}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              >
                <option value="all">الكل</option>
                {(Object.keys(QA_CATEGORY_LABELS) as RouteCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {QA_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">الصلاحية لدورك</label>
              <select
                value={routeAccessFilter}
                onChange={(e) => setRouteAccessFilter(e.target.value as 'all' | 'allowed' | 'denied')}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              >
                <option value="all">الكل</option>
                <option value="allowed">مسموح فقط</option>
                <option value="denied">محظور فقط</option>
              </select>
            </div>
            <p className="text-xs text-white/40 w-full">
              الدور الحالي: <strong className="text-white/70">{role ? ROLE_LABELS[role] : '—'}</strong>
              {' — '}
              لاختبار شاشات دور آخر، سجّل الخروج وادخل بحساب ذلك الدور من تبويب «حسابات تجريبية».
            </p>
          </Panel>

          <div className="grid gap-2">
            {filteredRoutes.map((entry) => {
              const access = canRoleAccessRoute(role, entry);
              const badge = ACCESS_BADGE[access];
              return (
                <Panel key={entry.id} className="p-3 flex flex-wrap items-center gap-3 hover:bg-white/[0.02]">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white/90">{entry.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border bg-white/5 text-white/40">
                        {QA_CATEGORY_LABELS[entry.category]}
                      </span>
                      <span className={clsx('text-[10px] px-2 py-0.5 rounded-full border', badge.className)}>
                        {badge.label}
                      </span>
                    </div>
                    <code className="text-xs text-gold-400/80 mt-1 block truncate" dir="ltr">
                      {entry.path}
                    </code>
                    {entry.notes && <p className="text-[11px] text-white/35 mt-1">{entry.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Copy className="w-3.5 h-3.5" />}
                      onClick={() => copyText(entry.path, 'المسار')}
                    >
                      نسخ
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                      onClick={() => window.open(entry.path, '_blank', 'noopener')}
                    >
                      تبويب جديد
                    </Button>
                    <Button
                      size="sm"
                      icon={<Route className="w-3.5 h-3.5" />}
                      onClick={() => navigate(entry.path)}
                    >
                      فتح
                    </Button>
                  </div>
                </Panel>
              );
            })}
            {filteredRoutes.length === 0 && (
              <Panel className="p-8 text-center text-white/40">لا توجد شاشات مطابقة للفلتر</Panel>
            )}
          </div>
        </div>
      )}

      {tab === 'tests' && (
        <div className="space-y-4">
          <Panel className="p-4">
            <SectionTitle>مجموعات الاختبار</SectionTitle>
            <div className="flex flex-wrap gap-2 mt-3">
              {testGroupOptions.map((g) => {
                const active =
                  g.id === 'all'
                    ? selectedTestGroups.includes('all')
                    : selectedTestGroups.includes(g.id) || selectedTestGroups.includes('all');
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      if (g.id === 'all') {
                        setSelectedTestGroups(['all']);
                        return;
                      }
                      setSelectedTestGroups((prev) => {
                        const id = g.id;
                        if (id === 'all') return ['all'];
                        const withoutAll = prev.filter((x) => x !== 'all') as Exclude<QaTestGroup, 'all'>[];
                        if (withoutAll.includes(id)) {
                          const next = withoutAll.filter((x) => x !== id);
                          return next.length ? next : ['all'];
                        }
                        return [...withoutAll, id];
                      });
                    }}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                      active
                        ? 'bg-gold-500/20 border-gold-500/40 text-gold-300'
                        : 'bg-white/5 border-white/10 text-white/50'
                    )}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                icon={running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                onClick={() => void runTests(selectedTestGroups)}
                loading={running}
              >
                تشغيل المحدد
              </Button>
              <Button
                variant="secondary"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => {
                  setResults([]);
                  setSummary(null);
                }}
              >
                مسح النتائج
              </Button>
            </div>
          </Panel>

          {Object.entries(groupedResults).map(([group, items]) => (
            <Panel key={group} className="overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <span className="font-semibold text-white/90">{group}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40">
                    {items.filter((i) => i.status === 'pass').length}/{items.length}
                  </span>
                  {expandedGroups[group] ? (
                    <ChevronUp className="w-4 h-4 text-white/40" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/40" />
                  )}
                </div>
              </button>
              {expandedGroups[group] && (
                <div className="border-t border-white/10 divide-y divide-white/5">
                  {items.map((item) => (
                    <div key={item.id} className="px-4 py-3 flex flex-wrap gap-2 items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/85">{item.name}</p>
                        <p className="text-xs text-white/45 mt-0.5">{item.message}</p>
                        {item.details && (
                          <p className="text-[11px] text-amber-400/70 mt-1">{item.details}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.durationMs != null && (
                          <span className="text-[10px] text-white/30">{item.durationMs}ms</span>
                        )}
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          ))}

          {results.length === 0 && !running && (
            <Panel className="p-10 text-center space-y-4">
              <FlaskConical className="w-12 h-12 text-gold-400/50 mx-auto" />
              <p className="text-white/70 font-medium">لا توجد نتائج بعد</p>
              <p className="text-white/40 text-sm max-w-md mx-auto">
                اضغط الزر الذهبي «تشغيل كل الاختبارات» في أعلى الصفحة — ستُنقل تلقائياً لهذا التبويب وتظهر
                النتائج واحدة تلو الأخرى.
              </p>
              <Button icon={<Play className="w-4 h-4" />} onClick={() => void runTests()}>
                تشغيل الاختبارات الآن
              </Button>
            </Panel>
          )}
        </div>
      )}

      {tab === 'scenarios' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {QA_SCENARIOS.map((scenario) => (
            <Panel key={scenario.id} className="p-5 space-y-3">
              <div>
                <h3 className="font-bold text-white/95">{scenario.title}</h3>
                <p className="text-sm text-white/45 mt-1">{scenario.description}</p>
              </div>
              <ol className="space-y-1.5 list-decimal list-inside text-sm text-white/70">
                {scenario.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                {scenario.relatedRoutes.map((path) => (
                  <Link
                    key={path}
                    to={path}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gold-400 hover:bg-white/10 transition-colors"
                  >
                    {path}
                  </Link>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {tab === 'accounts' && (
        <div className="space-y-4">
          <Panel className="p-4 text-sm text-white/60">
            <p>
              لمحاكاة <strong className="text-white/90">كل الأدوار</strong>، سجّل الخروج ثم ادخل بكل حساب
              حقيقي على حدة وكرّر الاختبارات.
            </p>
            <p className="mt-2 text-white/40">
              تم إزالة الحسابات التجريبية من المنصة — أنشئ المستخدمين من إدارة المستخدمين.
            </p>
            <p className="mt-2 text-white/40">
              المستخدم الحالي: {user?.full_name ?? '—'} ({user?.email ?? '—'})
            </p>
          </Panel>

          {QA_DEMO_ACCOUNTS.length === 0 ? (
            <Panel className="p-4 text-sm text-white/45">لا توجد حسابات تجريبية مضمّنة في الكود.</Panel>
          ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {QA_DEMO_ACCOUNTS.map((acc) => (
              <Panel key={acc.email} className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-white/90">{acc.label}</h3>
                  <p className="text-xs text-white/40 mt-1">الدور: {ROLE_LABELS[acc.role]}</p>
                </div>
                <div className="space-y-2 text-sm font-mono" dir="ltr">
                  <div className="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-white/70 truncate">{acc.email}</span>
                    <button
                      type="button"
                      onClick={() => copyText(acc.email, 'البريد')}
                      className="text-gold-400 hover:text-gold-300 shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-white/50">••••••••</span>
                    <button
                      type="button"
                      onClick={() => copyText(acc.password, 'كلمة المرور')}
                      className="text-gold-400 hover:text-gold-300 shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  icon={<LogIn className="w-4 h-4" />}
                  onClick={() => {
                    void useAuthStore.getState().logout();
                    navigate('/login');
                    toast('سجّل الدخول بالحساب التجريبي', { icon: '🔑' });
                  }}
                >
                  تسجيل خروج والذهاب لصفحة الدخول
                </Button>
              </Panel>
            ))}
          </div>
          )}

          <Panel className="p-4">
            <SectionTitle>أدوار يجب اختبارها يدوياً</SectionTitle>
            <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm text-white/65">
              {(['principal', 'admin', 'supervisor', 'teacher', 'deputy', 'reviewer', 'student', 'parent'] as const).map((r) => (
                <li key={r} className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'w-2 h-2 rounded-full',
                      role === r ? 'bg-emerald-400' : 'bg-white/20'
                    )}
                  />
                  {ROLE_LABELS[r]}
                  {role === r && <span className="text-emerald-400 text-xs">(أنت هنا)</span>}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}
