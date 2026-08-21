import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import {
  deletePlatformSchedule,
  formatIntervalMinutes,
  listPlatformSchedules,
  setPlatformScheduleEnabled,
  tickPlatformSchedules,
  upsertPlatformSchedule,
  type PlatformSchedule,
} from '../../lib/platformSchedules';
import { invokeJobsWorker } from '../../lib/platformJobs';
import { showError, showSuccess } from '../../lib/toast';

const JOB_TYPES = ['ping', 'health_check', 'whatsapp_reminder', 'academic_reminder', 'parent_digest'];

export function DevSchedulesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    slug: '',
    label: '',
    job_type: 'ping',
    interval_minutes: 60,
    enabled: true,
    notes: '',
    dry_run: false,
  });

  const listQuery = useQuery({
    queryKey: ['dev', 'schedules'],
    queryFn: listPlatformSchedules,
    refetchInterval: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['dev', 'schedules'] });
    qc.invalidateQueries({ queryKey: ['dev', 'jobs'] });
  };

  const tickMut = useMutation({
    mutationFn: async () => {
      const tick = await tickPlatformSchedules(20);
      let worker: { claimed?: number } | null = null;
      if (tick.enqueued > 0) {
        worker = await invokeJobsWorker(Math.max(5, tick.enqueued + 2));
      }
      return { tick, worker };
    },
    onSuccess: ({ tick, worker }) => {
      showSuccess(
        `Tick: ${tick.enqueued} مهمة` +
          (worker ? ` · العامل عالج ${worker.claimed ?? 0}` : ''),
      );
      invalidate();
    },
    onError: (e: Error) => showError(e),
  });

  const upsertMut = useMutation({
    mutationFn: () =>
      upsertPlatformSchedule({
        slug: form.slug.trim(),
        label: form.label.trim() || form.slug.trim(),
        job_type: form.job_type,
        interval_minutes: form.interval_minutes,
        enabled: form.enabled,
        notes: form.notes || null,
        reset_next: true,
        payload: {
          source: 'schedules-ui',
          dry_run: form.dry_run,
          kind: form.job_type.includes('reminder') ? 'homework' : undefined,
        },
      }),
    onSuccess: () => {
      showSuccess('حُفظ الجدول');
      setShowForm(false);
      setForm({
        slug: '',
        label: '',
        job_type: 'ping',
        interval_minutes: 60,
        enabled: true,
        notes: '',
        dry_run: false,
      });
      invalidate();
    },
    onError: (e: Error) => showError(e),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      setPlatformScheduleEnabled(id, enabled),
    onSuccess: () => invalidate(),
    onError: (e: Error) => showError(e),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePlatformSchedule(id),
    onSuccess: () => {
      showSuccess('حُذف الجدول');
      invalidate();
    },
    onError: (e: Error) => showError(e),
  });

  const rows = listQuery.data ?? [];
  const missingTable =
    listQuery.error?.message?.includes('platform_schedules')
    || listQuery.error?.message?.includes('schema cache');

  return (
    <RolePageShell>
      <PageHeader
        title="المهام المجدولة"
        subtitle="محرك Cron موحّد داخل DB → طابور Jobs → عامل"
        icon={Calendar}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={tickMut.isPending} onClick={() => tickMut.mutate()}>
              <RefreshCw className={`w-3.5 h-3.5 ml-1 ${tickMut.isPending ? 'animate-spin' : ''}`} />
              Tick الآن
            </Button>
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="w-3.5 h-3.5 ml-1" />
              جدول
            </Button>
          </div>
        }
      />

      <HorizonCard className="mb-4">
        <p className="text-sm text-surface-muted leading-relaxed">
          الجداول المستحقة تُدرَج في{' '}
          <Link to="/dev/jobs" className="text-gold-400 hover:underline">/dev/jobs</Link>
          {' '}عبر <code className="text-xs text-emerald-300">tick_platform_schedules</code>.
          العامل يستدعي الـ tick تلقائياً عند التشغيل. للإنتاج: اربط pg_cron أو استدعِ العامل كل دقائق.
          واتساب الحي افتراضي (ما لم تفعّل dry_run) ويحترم <code className="text-xs">whatsapp_send_enabled</code>.
        </p>
      </HorizonCard>

      {missingTable && (
        <HorizonCard className="mb-4 border border-amber-500/30 bg-amber-500/5">
          <p className="text-sm text-amber-100">
            طبّق الهجرة <code className="text-xs">103_wave5_cron_templates_whatsapp.sql</code> ثم أعد التحميل.
          </p>
        </HorizonCard>
      )}

      {showForm && (
        <HorizonCard className="mb-4 space-y-3">
          <p className="text-sm font-semibold text-white">جدول جديد / تحديث بالـ slug</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
              placeholder="slug (مثل nightly-health)"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
            <input
              className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
              placeholder="الاسم الظاهر"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
            <select
              className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
              value={form.job_type}
              onChange={(e) => setForm((f) => ({ ...f, job_type: e.target.value }))}
            >
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
              placeholder="الفاصل بالدقائق"
              value={form.interval_minutes}
              onChange={(e) => setForm((f) => ({ ...f, interval_minutes: Number(e.target.value) || 60 }))}
            />
          </div>
          <textarea
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
            placeholder="ملاحظات"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-surface-muted">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
            مفعّل
          </label>
          <label className="flex items-center gap-2 text-sm text-surface-muted">
            <input
              type="checkbox"
              checked={form.dry_run}
              onChange={(e) => setForm((f) => ({ ...f, dry_run: e.target.checked }))}
            />
            dry_run (للتذكيرات/الملخص — بدون إرسال حي)
          </label>
          <Button size="sm" disabled={upsertMut.isPending || !form.slug.trim()} onClick={() => upsertMut.mutate()}>
            حفظ
          </Button>
        </HorizonCard>
      )}

      <div className="space-y-2">
        {rows.map((s: PlatformSchedule) => (
          <HorizonCard key={s.id} className="!p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">{s.label}</p>
                  <code className="text-[10px] text-emerald-300/90">{s.slug}</code>
                  {!s.enabled && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200">متوقف</span>
                  )}
                </div>
                <p className="text-xs text-surface-muted mt-1">
                  {s.job_type} · {formatIntervalMinutes(s.interval_minutes)}
                </p>
                <p className="text-[11px] text-white/40 mt-1">
                  التالي: {new Date(s.next_run_at).toLocaleString('ar-SA')}
                  {s.last_enqueued_at
                    ? ` · آخر إدراج: ${new Date(s.last_enqueued_at).toLocaleString('ar-SA')}`
                    : ''}
                </p>
                {s.notes && <p className="text-xs text-white/50 mt-2">{s.notes}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={toggleMut.isPending}
                  onClick={() => toggleMut.mutate({ id: s.id, enabled: !s.enabled })}
                >
                  <Play className="w-3.5 h-3.5 ml-1" />
                  {s.enabled ? 'إيقاف' : 'تفعيل'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={deleteMut.isPending}
                  onClick={() => {
                    if (confirm(`حذف الجدول ${s.slug}؟`)) deleteMut.mutate(s.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-300" />
                </Button>
              </div>
            </div>
          </HorizonCard>
        ))}
        {!missingTable && !listQuery.isLoading && rows.length === 0 && (
          <p className="text-sm text-surface-muted">لا جداول — أنشئ جدولاً أو طبّق بذرة الهجرة 103.</p>
        )}
      </div>
    </RolePageShell>
  );
}
