import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, Search, FlaskConical, Copy, Trash2, Download } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { HubTabs, type HubTabItem } from '../../components/ui/HubTabs';
import { VirtualizedList } from '../../components/ui/VirtualizedList';
import { supabase } from '../../lib/supabase';
import {
  ERROR_SEVERITY_LABELS,
  ERROR_SOURCE_LABELS,
  ERROR_STATUS_LABELS,
  enqueueCriticalErrorWhatsAppAlert,
  fetchPlatformErrorAnalytics,
  getPlatformErrorById,
  getPlatformErrorStats,
  formatPlatformErrorForClipboard,
  formatPlatformErrorsDump,
  listPlatformErrors,
  reportPlatformError,
  updatePlatformErrorStatus,
  purgeAllPlatformErrors,
  type PlatformError,
  type PlatformErrorSeverity,
  type PlatformErrorSource,
  type PlatformErrorStatus,
} from '../../lib/platformErrors';
import {
  DEFAULT_DEV_ALERT_SETTINGS,
  getDevAlertSettings,
  saveDevAlertSettings,
  simulateRealisticUserError,
  type DevAlertSettings,
  type SimulateErrorScenario,
} from '../../lib/devAlertSettings';
import { showError, showSuccess } from '../../lib/toast';
import clsx from 'clsx';

const SIM_SCENARIOS: { id: SimulateErrorScenario; label: string }[] = [
  { id: 'teacher_homework', label: 'معلم — فشل حفظ واجب' },
  { id: 'parent_portal', label: 'ولي أمر — فشل بوابة' },
  { id: 'api_500', label: 'API 500 — عطل خادم' },
];

type ListFilter = 'active' | 'all' | 'critical' | 'quality' | PlatformErrorSource;

const FILTERS: HubTabItem<ListFilter>[] = [
  { id: 'active', label: 'نشطة' },
  { id: 'critical', label: 'Critical' },
  { id: 'quality', label: 'Medium / Low' },
  { id: 'all', label: 'الكل' },
  { id: 'frontend', label: 'واجهة' },
  { id: 'api', label: 'API' },
  { id: 'edge', label: 'Edge' },
  { id: 'ai', label: 'AI' },
  { id: 'whatsapp', label: 'واتساب' },
  { id: 'job', label: 'Jobs' },
  { id: 'ocr', label: 'OCR' },
  { id: 'auth', label: 'Auth' },
  { id: 'realtime', label: 'Realtime' },
  { id: 'database', label: 'DB' },
  { id: 'storage', label: 'Storage' },
];

function severityClass(sev: string) {
  if (sev === 'critical') return 'text-red-200 bg-red-500/20 border-red-500/30';
  if (sev === 'error') return 'text-red-300/90 bg-red-500/10 border-red-500/20';
  if (sev === 'warning') return 'text-amber-300 bg-amber-500/10 border-amber-500/20';
  return 'text-white/60 bg-white/5 border-white/10';
}

function statusClass(st: string) {
  if (st === 'fixed') return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25';
  if (st === 'investigating') return 'text-sky-300 bg-sky-500/10 border-sky-500/25';
  if (st === 'ignored') return 'text-white/45 bg-white/5 border-white/10';
  return 'text-amber-200 bg-amber-500/10 border-amber-500/25';
}

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (!ok) throw new Error('تعذّر النسخ إلى الحافظة');
  }
}

function listFilterOpts(filter: ListFilter, search: string, limit: number) {
  const source =
    filter === 'active' || filter === 'all' || filter === 'critical' || filter === 'quality'
      ? 'all' as const
      : filter;
  return {
    source,
    status: (filter === 'active' || filter === 'critical' || filter === 'quality' ? 'active' : 'all') as 'active' | 'all',
    severity: (filter === 'critical' ? 'critical' : 'all') as PlatformErrorSeverity | 'all',
    severities: filter === 'quality' ? (['warning', 'info'] as PlatformErrorSeverity[]) : undefined,
    search: search || undefined,
    limit,
  };
}

export function DevErrorsPage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<ListFilter>('active');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('id'));
  const [notes, setNotes] = useState('');
  const [windowHours, setWindowHours] = useState(24);
  const [alertDraft, setAlertDraft] = useState<DevAlertSettings | null>(null);
  const [simScenario, setSimScenario] = useState<SimulateErrorScenario>('teacher_homework');

  useEffect(() => {
    const fromUrl = searchParams.get('id');
    if (fromUrl && fromUrl !== selectedId) setSelectedId(fromUrl);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectIncident = (id: string | null) => {
    setSelectedId(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set('id', id);
      else next.delete('id');
      return next;
    }, { replace: true });
  };

  const statsQuery = useQuery({
    queryKey: ['dev', 'errors', 'stats'],
    queryFn: getPlatformErrorStats,
    refetchInterval: 15_000,
    retry: false,
  });

  const alertQuery = useQuery({
    queryKey: ['dev', 'alert-settings'],
    queryFn: getDevAlertSettings,
    retry: false,
  });
  const alertSettings = alertDraft ?? alertQuery.data ?? DEFAULT_DEV_ALERT_SETTINGS;

  const analyticsQuery = useQuery({
    queryKey: ['dev', 'errors', 'analytics', windowHours],
    queryFn: () => fetchPlatformErrorAnalytics(windowHours),
    refetchInterval: 30_000,
    retry: false,
  });

  const listQuery = useQuery({
    queryKey: ['dev', 'errors', 'list', filter, search],
    queryFn: () => listPlatformErrors(listFilterOpts(filter, search, 120)),
    refetchInterval: 12_000,
    retry: false,
  });

  const deepLinkQuery = useQuery({
    queryKey: ['dev', 'errors', 'by-id', selectedId],
    queryFn: () => getPlatformErrorById(selectedId!),
    enabled: !!selectedId,
    retry: false,
  });

  const selected = useMemo(() => {
    const fromList = (listQuery.data ?? []).find((e) => e.id === selectedId) ?? null;
    return fromList ?? deepLinkQuery.data ?? null;
  }, [listQuery.data, selectedId, deepLinkQuery.data]);

  useEffect(() => {
    setNotes(selected?.resolution_notes ?? '');
  }, [selected?.id, selected?.resolution_notes]);

  // selectIncident معرّف أعلى مع حالة الـ URL

  // Realtime: أخطاء جديدة / حرجة
  useEffect(() => {
    const channel = supabase
      .channel('dev-platform-errors')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_errors' },
        () => {
          qc.invalidateQueries({ queryKey: ['dev', 'errors'] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const missing =
    listQuery.error?.message?.includes('platform_errors')
    || listQuery.error?.message?.includes('schema cache');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['dev', 'errors'] });
  };

  const statusMut = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: PlatformErrorStatus; note?: string }) =>
      updatePlatformErrorStatus(id, status, note),
    onSuccess: () => {
      showSuccess('تم تحديث الحالة');
      invalidate();
    },
    onError: (e: Error) => showError(e),
  });

  const testMut = useMutation({
    mutationFn: async () => {
      const id = await reportPlatformError({
        source: 'frontend',
        severity: 'critical',
        message: `اختبار Global Error Monitoring — ${new Date().toISOString()}`,
        context: { from: 'dev-errors-ui', gem: true },
      });
      return id;
    },
    onSuccess: (id) => {
      if (id) {
        showSuccess('سُجِّل خطأ اختباري حرج — سيصل واتساب إن وُجد رقم');
        invalidate();
        selectIncident(id);
      } else showError(new Error('تعذّر التسجيل — طبّق migrations 093 ثم 099 ثم 109'));
    },
  });

  const simMut = useMutation({
    mutationFn: () => simulateRealisticUserError(simScenario),
    onSuccess: (id) => {
      showSuccess('محاكاة حقيقية أُرسلت — راجع واتسابك خلال ثوانٍ');
      invalidate();
      selectIncident(id);
    },
    onError: (e: Error) => showError(e),
  });

  const saveAlertMut = useMutation({
    mutationFn: () => saveDevAlertSettings(alertSettings),
    onSuccess: () => {
      showSuccess('حُفظ رقم تنبيه واتساب للمطور');
      setAlertDraft(null);
      qc.invalidateQueries({ queryKey: ['dev', 'alert-settings'] });
    },
    onError: (e: Error) => showError(e),
  });

  const copyAllMut = useMutation({
    mutationFn: async () => {
      const errors = await listPlatformErrors(listFilterOpts(filter, search, 500));
      if (errors.length === 0) throw new Error('لا توجد أخطاء لنسخها في هذا التصفية');
      const filterLabel = FILTERS.find((f) => f.id === filter)?.label ?? String(filter);
      await copyTextToClipboard(formatPlatformErrorsDump(errors, { filterLabel }));
      return errors.length;
    },
    onSuccess: (n) => showSuccess(`نُسخ ${n} خطأ — الصقها في المحادثة لحلها`),
    onError: (e: Error) => showError(e),
  });

  const downloadReportMut = useMutation({
    mutationFn: async () => {
      const errors = await listPlatformErrors(listFilterOpts(filter, search, 500));
      if (errors.length === 0) throw new Error('لا توجد أخطاء لتصديرها في هذا التصفية');
      const filterLabel = FILTERS.find((f) => f.id === filter)?.label ?? String(filter);
      const content = formatPlatformErrorsDump(errors, { filterLabel });
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'proplem.md';
      a.click();
      URL.revokeObjectURL(url);
      return errors.length;
    },
    onSuccess: (n) => showSuccess(`تم تنزيل ملف proplem.md بنجاح (${n} خطأ)`),
    onError: (e: Error) => showError(e),
  });

  const purgeMut = useMutation({
    mutationFn: purgeAllPlatformErrors,
    onSuccess: (n) => {
      showSuccess(n > 0 ? `حُذف ${n} خطأ — السجل فارغ الآن` : 'السجل فارغ مسبقاً');
      setSelectedId(null);
      invalidate();
    },
    onError: (e: Error) => showError(e),
  });

  const copyOne = async (err: PlatformError) => {
    try {
      await copyTextToClipboard(formatPlatformErrorForClipboard(err));
      showSuccess('نُسخ الخطأ — الصقه في المحادثة');
    } catch (e) {
      showError(e instanceof Error ? e : new Error('تعذّر النسخ'));
    }
  };

  const analytics = analyticsQuery.data;
  const bySource = analytics?.by_source ? Object.entries(analytics.by_source) : [];
  const alertMissing =
    alertQuery.error?.message?.includes('dev_get_alert_settings')
    || alertQuery.error?.message?.includes('schema cache');

  return (
    <RolePageShell>
      <PageHeader
        title="Global Error Monitoring"
        subtitle="التقاط · تشخيص · تحليل · حل — Platform Developer"
        icon={ShieldAlert}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => downloadReportMut.mutate()}
              disabled={downloadReportMut.isPending || !!missing}
            >
              {downloadReportMut.isPending ? 'جاري التنزيل…' : 'تنزيل proplem.md'}
            </Button>
            <Button
              variant="secondary"
              icon={<Copy className="w-3.5 h-3.5" />}
              onClick={() => copyAllMut.mutate()}
              disabled={copyAllMut.isPending || !!missing}
            >
              {copyAllMut.isPending ? 'جاري النسخ…' : 'نسخ جميع الأخطاء'}
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => {
                if (
                  confirm(
                    'حذف كل الأخطاء الحالية من شاشة المطوّر والبدء من سجل فارغ؟ لا يمكن التراجع.',
                  )
                ) {
                  purgeMut.mutate();
                }
              }}
              disabled={purgeMut.isPending || !!missing}
            >
              {purgeMut.isPending ? 'جاري المسح…' : 'مسح السجل'}
            </Button>
            <Button
              variant="secondary"
              icon={<FlaskConical className="w-3.5 h-3.5" />}
              onClick={() => testMut.mutate()}
              disabled={testMut.isPending || !!missing}
            >
              اختبار سريع
            </Button>
            <Button
              icon={<FlaskConical className="w-3.5 h-3.5" />}
              onClick={() => simMut.mutate()}
              disabled={simMut.isPending || !!missing || !!alertMissing}
            >
              محاكاة حقيقية
            </Button>
          </div>
        }
      />

      {missing && (
        <HorizonCard className="border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-100">
            طبّق{' '}
            <code className="text-white/80">093_platform_files_and_errors.sql</code>
            {' '}ثم{' '}
            <code className="text-white/80">099_global_error_monitoring.sql</code>.
          </p>
        </HorizonCard>
      )}

      <HorizonCard className="mb-4 border border-emerald-500/20 bg-emerald-500/5">
        <p className="text-sm font-semibold text-white mb-1">تنبيه واتساب للمطور</p>
        <p className="text-xs text-surface-muted mb-3 leading-relaxed">
          عند حدوث مشكلة لمستخدم يُرسل إليك واتساب باسمه ونص المشكلة. الرقم هنا مستقل عن حساب المطور
          (لا حاجة لإدخاله في ملف المستخدم).
        </p>
        {alertMissing ? (
          <p className="text-xs text-amber-200">
            طبّق الهجرة <code className="text-[11px]">104_dev_whatsapp_error_alerts.sql</code> ثم أعد التحميل.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <label className="flex-1 text-xs text-surface-muted">
              رقم واتساب المطور
              <input
                className="mt-1 w-full rounded-xl bg-navy-950 border border-white/10 px-3 py-2 text-sm text-white"
                placeholder="05xxxxxxxx أو 9665…"
                value={alertSettings.whatsapp_phone}
                onChange={(e) =>
                  setAlertDraft({ ...alertSettings, whatsapp_phone: e.target.value })
                }
                dir="ltr"
              />
            </label>
            <label className="text-xs text-surface-muted">
              الحد الأدنى للشدة
              <select
                className="mt-1 w-full rounded-xl bg-navy-950 border border-white/10 px-3 py-2 text-sm text-white"
                value={alertSettings.min_severity}
                onChange={(e) =>
                  setAlertDraft({
                    ...alertSettings,
                    min_severity: e.target.value as DevAlertSettings['min_severity'],
                  })
                }
              >
                <option value="warning">تحذير فأعلى</option>
                <option value="error">خطأ فأعلى</option>
                <option value="critical">حرج فقط</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-surface-muted pb-2">
              <input
                type="checkbox"
                checked={alertSettings.enabled}
                onChange={(e) =>
                  setAlertDraft({ ...alertSettings, enabled: e.target.checked })
                }
              />
              مفعّل
            </label>
            <Button
              size="sm"
              disabled={saveAlertMut.isPending || !alertDraft}
              onClick={() => saveAlertMut.mutate()}
            >
              حفظ الرقم
            </Button>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
          <p className="text-xs font-semibold text-white">كيف تجرب محاكاة حقيقية؟</p>
          <ol className="text-[11px] text-surface-muted list-decimal list-inside space-y-1 leading-relaxed">
            <li>طبّق الهجرات 104 ثم 105 ثم 106</li>
            <li>احفظ رقم واتسابك أعلاه وتأكد أن واتساب الخادم متصل</li>
            <li>اختر سيناريو ثم اضغط «محاكاة حقيقية»</li>
            <li>انتظر الرسالة: اسم مستخدم تجريبي + جواله + المشكلة</li>
          </ol>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end pt-1">
            <label className="flex-1 text-xs text-surface-muted">
              سيناريو المحاكاة
              <select
                className="mt-1 w-full rounded-xl bg-navy-950 border border-white/10 px-3 py-2 text-sm text-white"
                value={simScenario}
                onChange={(e) => setSimScenario(e.target.value as SimulateErrorScenario)}
              >
                {SIM_SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
            <Button
              size="sm"
              disabled={simMut.isPending || !!alertMissing}
              onClick={() => simMut.mutate()}
            >
              {simMut.isPending ? 'جاري الإرسال…' : 'تشغيل المحاكاة'}
            </Button>
          </div>
        </div>
      </HorizonCard>

      {statsQuery.data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {(
            [
              ['open', 'نشطة', statsQuery.data.open],
              ['critical', 'حرجة', statsQuery.data.critical],
              ['mild', 'جودة / خفيفة', statsQuery.data.mildOpen ?? 0],
              ['users', 'مستخدمون متأثرون', statsQuery.data.affectedUsers],
              ['last24h', 'أحداث 24س', statsQuery.data.last24h],
              ['total', 'سجلات', statsQuery.data.total],
            ] as const
          ).map(([key, label, value]) => (
            <HorizonCard key={key} padding="sm" className="border border-white/5">
              <p className="text-[10px] text-surface-muted">{label}</p>
              <p className={clsx(
                'text-xl font-bold tabular-nums mt-1',
                key === 'critical' && value > 0 ? 'text-red-300'
                : key === 'mild' && value > 0 ? 'text-amber-300'
                : 'text-white',
              )}>
                {value}
              </p>
            </HorizonCard>
          ))}
        </div>
      )}

      {/* Analytics */}
      <HorizonCard className="border border-white/8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-sm font-bold text-white">Error Analytics</p>
          <div className="flex gap-1">
            {[24, 72, 168].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setWindowHours(h)}
                className={clsx(
                  'text-[10px] px-2 py-1 rounded-lg border',
                  windowHours === h
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/10 text-white/50 hover:bg-white/5',
                )}
              >
                {h === 168 ? '7 أيام' : `${h}س`}
              </button>
            ))}
          </div>
        </div>
        {!analytics ? (
          <p className="text-xs text-surface-muted">
            التحليلات تتطلب migration 099 — أو لا بيانات بعد.
          </p>
        ) : (
          <div className="grid md:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-surface-muted mb-2">أكثر الخدمات فشلاً</p>
              <ul className="space-y-1">
                {bySource.length === 0 && <li className="text-white/40">—</li>}
                {bySource.slice(0, 6).map(([src, cnt]) => (
                  <li key={src} className="flex justify-between gap-2 text-white/80">
                    <span>{ERROR_SOURCE_LABELS[src as PlatformErrorSource] ?? src}</span>
                    <span className="tabular-nums text-white/50">{cnt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-surface-muted mb-2">أكثر الصفحات أخطاءً</p>
              <ul className="space-y-1">
                {(analytics.by_route ?? []).slice(0, 6).map((r) => (
                  <li key={r.route} className="flex justify-between gap-2 text-white/80">
                    <span className="truncate font-mono text-[10px]">{r.route}</span>
                    <span className="tabular-nums text-white/50 shrink-0">{r.cnt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-surface-muted mb-2">أكثر المستخدمين تأثراً</p>
              <ul className="space-y-1">
                {(analytics.top_users ?? []).slice(0, 6).map((u) => (
                  <li key={`${u.user_name}-${u.user_role}`} className="flex justify-between gap-2 text-white/80">
                    <span className="truncate">{u.user_name}</span>
                    <span className="tabular-nums text-white/50 shrink-0">{u.events}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-3 flex flex-wrap gap-4 pt-1 border-t border-white/5">
              <div>
                <p className="text-surface-muted">معدل نجاح المهام</p>
                <p className="text-lg font-bold text-white tabular-nums">
                  {analytics.job_success_rate_pct != null ? `${analytics.job_success_rate_pct}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-surface-muted">متوسط زمن المهمة</p>
                <p className="text-lg font-bold text-white tabular-nums">
                  {analytics.avg_job_duration_ms != null ? `${analytics.avg_job_duration_ms} ms` : '—'}
                </p>
              </div>
              <div>
                <p className="text-surface-muted">أحداث النافذة</p>
                <p className="text-lg font-bold text-white tabular-nums">{analytics.total_events}</p>
              </div>
            </div>
            <div className="md:col-span-3">
              <p className="text-surface-muted mb-2">أكثر الأخطاء تكراراً</p>
              <ul className="space-y-1.5">
                {(analytics.top_messages ?? []).slice(0, 5).map((m, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 border-b border-white/5 pb-1.5">
                    <span className="text-white/85 line-clamp-2">{m.message}</span>
                    <span className="tabular-nums text-white/45 shrink-0">×{m.cnt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </HorizonCard>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <HubTabs tabs={FILTERS} activeId={filter} onChange={setFilter} ariaLabel="تصفية الأخطاء" />
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الرسالة…"
            className="w-full rounded-xl border border-white/10 bg-white/5 pr-9 pl-3 py-2 text-sm text-white placeholder:text-white/30"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          icon={<Copy className="w-3.5 h-3.5" />}
          onClick={() => copyAllMut.mutate()}
          disabled={copyAllMut.isPending || !!missing || (listQuery.data?.length ?? 0) === 0}
        >
          {copyAllMut.isPending ? 'جاري النسخ…' : 'نسخ القائمة'}
        </Button>
      </div>

      {listQuery.isLoading ? (
        <TapHandLoader label="جاري تحميل الأخطاء..." />
      ) : (
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 space-y-2">
            {(listQuery.data ?? []).length === 0 ? (
              <HorizonCard>
                <p className="text-sm text-surface-muted text-center py-6">لا أخطاء في هذا التصفية</p>
              </HorizonCard>
            ) : (
              <VirtualizedList
                items={listQuery.data ?? []}
                itemHeight={78}
                height={Math.min(560, Math.max(240, (listQuery.data?.length ?? 0) * 78))}
                threshold={25}
                gap={8}
                keyExtractor={(err) => err.id}
                renderItem={(err) => (
                  <ErrorRow
                    err={err}
                    active={err.id === selectedId}
                    onSelect={() => selectIncident(err.id)}
                  />
                )}
              />
            )}
          </div>

          <div className="lg:col-span-2">
            <HorizonCard className="border border-white/8 sticky top-2">
              <p className="text-sm font-bold text-white mb-3">تفاصيل الخطأ</p>
              {!selected ? (
                <p className="text-xs text-surface-muted">اختر خطأً من القائمة</p>
              ) : (
                <ErrorDetail
                  selected={selected}
                  notes={notes}
                  setNotes={setNotes}
                  statusMut={statusMut}
                  onCopy={() => { void copyOne(selected); }}
                  onWhatsApp={() => {
                    void enqueueCriticalErrorWhatsAppAlert(selected.id, selected.message).then(() => {
                      showSuccess('أُرسل تنبيه واتساب لرقم المطور');
                    });
                  }}
                />
              )}
            </HorizonCard>
          </div>
        </div>
      )}
    </RolePageShell>
  );
}

function ErrorDetail({
  selected,
  notes,
  setNotes,
  statusMut,
  onCopy,
  onWhatsApp,
}: {
  selected: PlatformError;
  notes: string;
  setNotes: (v: string) => void;
  statusMut: {
    mutate: (v: { id: string; status: PlatformErrorStatus; note?: string }) => void;
    isPending: boolean;
  };
  onCopy: () => void;
  onWhatsApp: () => void;
}) {
  const status = (selected.status ?? (selected.resolved_at ? 'fixed' : 'new')) as PlatformErrorStatus;

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap gap-2">
        <span className={clsx('px-2 py-0.5 rounded-full border', severityClass(selected.severity))}>
          {ERROR_SEVERITY_LABELS[selected.severity as PlatformErrorSeverity] ?? selected.severity}
        </span>
        <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/60">
          {ERROR_SOURCE_LABELS[selected.source] ?? selected.source}
        </span>
        <span className={clsx('px-2 py-0.5 rounded-full border', statusClass(status))}>
          {ERROR_STATUS_LABELS[status] ?? status}
        </span>
        {(selected.occurrence_count ?? 1) > 1 && (
          <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/50">
            ×{selected.occurrence_count}
          </span>
        )}
      </div>

      <p className="text-sm text-white leading-relaxed break-words">{selected.message}</p>

      {typeof selected.context?.possible_cause === 'string' && selected.context.possible_cause && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
          <span className="font-semibold text-amber-200">Possible Cause: </span>
          {selected.context.possible_cause}
        </div>
      )}

      {(selected.context?.endpoint || selected.context?.method || selected.context?.status != null) && (
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 space-y-1 font-mono text-[10px] text-sky-100/80" dir="ltr">
          <p>
            {String(selected.context.method || 'GET')} {String(selected.context.endpoint || '—')}
          </p>
          {selected.context.status != null && <p>HTTP {String(selected.context.status)}</p>}
          {selected.context.params != null && (
            <p className="break-all">Params: {JSON.stringify(selected.context.params).slice(0, 300)}</p>
          )}
          {typeof selected.context.response_body === 'string' && selected.context.response_body && (
            <p className="break-all opacity-80">Body: {selected.context.response_body.slice(0, 300)}</p>
          )}
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-white/55">
        <dt>المستخدم</dt>
        <dd className="text-white/80 truncate">{selected.user_name ?? '—'}</dd>
        <dt>جوال المستخدم</dt>
        <dd className="text-white/80 font-mono text-left" dir="ltr">
          {selected.user_phone || 'غير مسجّل'}
        </dd>
        <dt>الدور</dt>
        <dd className="text-white/80">{selected.user_role ?? '—'}</dd>
        <dt>المسار</dt>
        <dd className="text-white/80 font-mono truncate" title={selected.route_path ?? ''}>
          {selected.route_path ?? '—'}
        </dd>
        <dt>الجهاز</dt>
        <dd className="text-white/80">
          {[selected.browser, selected.os_name, selected.device_type].filter(Boolean).join(' · ') || '—'}
        </dd>
        <dt>Correlation</dt>
        <dd className="text-white/80 font-mono truncate">
          {selected.correlation_id
            || (typeof selected.context?.correlation_id === 'string' ? selected.context.correlation_id : null)
            || selected.session_id
            || '—'}
        </dd>
        <dt>Request ID</dt>
        <dd className="text-white/80 font-mono truncate">{selected.request_id ?? '—'}</dd>
        <dt>آخر ظهور</dt>
        <dd className="text-white/80">
          {new Date(selected.last_seen_at ?? selected.created_at).toLocaleString('ar-SA')}
        </dd>
      </dl>

      {selected.url && (
        <p className="text-white/35 break-all font-mono text-[10px]">{selected.url}</p>
      )}
      {(typeof selected.context?.stack_short === 'string' ? selected.context.stack_short : selected.stack) && (
        <pre className="text-[10px] bg-black/30 rounded-lg p-2 overflow-auto max-h-40 text-red-200/70 whitespace-pre-wrap">
          {typeof selected.context?.stack_short === 'string' && selected.context.stack_short
            ? selected.context.stack_short
            : selected.stack}
        </pre>
      )}
      {Object.keys(selected.context ?? {}).length > 0 && (
        <pre className="text-[10px] bg-black/30 rounded-lg p-2 overflow-auto max-h-28 text-emerald-200/70">
          {JSON.stringify(selected.context, null, 2)}
        </pre>
      )}

      <label className="block space-y-1">
        <span className="text-white/50">ملاحظات المطور</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-white text-xs"
          placeholder="ملاحظات التحقيق / الإصلاح…"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={<Copy className="w-3.5 h-3.5" />} onClick={onCopy}>
          نسخ هذا الخطأ
        </Button>
        {(['new', 'investigating', 'fixed', 'ignored'] as PlatformErrorStatus[]).map((st) => (
          <Button
            key={st}
            size="sm"
            variant={status === st ? 'primary' : 'secondary'}
            disabled={statusMut.isPending}
            onClick={() => statusMut.mutate({ id: selected.id, status: st, note: notes })}
          >
            {st === 'fixed' ? <CheckCircle2 className="w-3.5 h-3.5 ml-1 inline" /> : null}
            {ERROR_STATUS_LABELS[st]}
          </Button>
        ))}
      </div>

      {(selected.severity === 'critical' || selected.severity === 'error') && (
        <Button size="sm" variant="secondary" onClick={onWhatsApp}>
          إرسال تنبيه واتساب الآن
        </Button>
      )}
    </div>
  );
}

function ErrorRow({
  err,
  active,
  onSelect,
}: {
  err: PlatformError;
  active: boolean;
  onSelect: () => void;
}) {
  const status = err.status ?? (err.resolved_at ? 'fixed' : 'new');
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'w-full text-right rounded-xl border px-3 py-2.5 transition-colors',
        active ? 'border-gold-500/40 bg-gold-500/10' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.05]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-white line-clamp-2 flex-1">{err.message}</p>
        <span className={clsx('text-[10px] px-2 py-0.5 rounded-full border shrink-0', severityClass(err.severity))}>
          {ERROR_SEVERITY_LABELS[err.severity]}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-surface-muted">
        <span>{ERROR_SOURCE_LABELS[err.source] ?? err.source}</span>
        {typeof err.context?.type === 'string' && (
          <>
            <span>·</span>
            <span className="text-amber-200/80">{String(err.context.type)}</span>
          </>
        )}
        <span>·</span>
        <span className={statusClass(status).split(' ')[0]}>{ERROR_STATUS_LABELS[status as PlatformErrorStatus] ?? status}</span>
        {(err.occurrence_count ?? 1) > 1 && (
          <>
            <span>·</span>
            <span>×{err.occurrence_count}</span>
          </>
        )}
        <span>·</span>
        <span>{new Date(err.last_seen_at ?? err.created_at).toLocaleString('ar-SA')}</span>
        {err.user_name && (
          <>
            <span>·</span>
            <span>{err.user_name}</span>
          </>
        )}
      </div>
    </button>
  );
}
