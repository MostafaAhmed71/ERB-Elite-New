import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FlaskConical } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { getSystemFlags, logSandboxAction } from '../../lib/platformDevTools';
import { fetchWhatsAppServerStatus } from '../../lib/whatsappReminder';
import { showError, showSuccess } from '../../lib/toast';
import clsx from 'clsx';

type SandboxResult = {
  target: string;
  ok: boolean;
  ms: number;
  body: unknown;
  error?: string;
};

async function timedInvoke(target: string, run: () => Promise<unknown>): Promise<SandboxResult> {
  const t0 = performance.now();
  try {
    const body = await run();
    return { target, ok: true, ms: Math.round(performance.now() - t0), body };
  } catch (e) {
    return {
      target,
      ok: false,
      ms: Math.round(performance.now() - t0),
      body: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function DevSandboxPage() {
  const [last, setLast] = useState<SandboxResult | null>(null);
  const [allowLive, setAllowLive] = useState(false);

  const runMut = useMutation({
    mutationFn: async (kind: string) => {
      const flags = await getSystemFlags().catch(() => null);
      const liveOk = allowLive && !!flags?.sandbox_live_calls;

      let result: SandboxResult;

      if (kind === 'jobs-ping') {
        result = await timedInvoke('jobs-worker:ping', async () => {
          const { data, error } = await supabase.functions.invoke('jobs-worker', {
            body: { limit: 1, dry_run: !liveOk },
          });
          if (error) throw error;
          return data;
        });
      } else if (kind === 'health-check-job') {
        result = await timedInvoke('jobs-worker:health_check', async () => {
          const { data, error } = await supabase.functions.invoke('jobs-worker', {
            body: { limit: 1 },
          });
          if (error) throw error;
          return data;
        });
      } else if (kind === 'whatsapp-status') {
        result = await timedInvoke('whatsapp:status', async () => fetchWhatsAppServerStatus());
      } else if (kind === 'ai-usage-rpc') {
        result = await timedInvoke('rpc:ai_usage_stats', async () => {
          const { data, error } = await supabase.rpc('ai_usage_stats', {
            p_from: new Date(Date.now() - 7 * 864e5).toISOString(),
            p_to: new Date().toISOString(),
          });
          if (error) throw error;
          return data;
        });
      } else if (kind === 'db-tables') {
        result = await timedInvoke('rpc:dev_list_public_tables', async () => {
          const { data, error } = await supabase.rpc('dev_list_public_tables');
          if (error) throw error;
          return { count: Array.isArray(data) ? data.length : 0, sample: (data ?? []).slice(0, 5) };
        });
      } else {
        throw new Error('اختبار غير معروف');
      }

      await logSandboxAction({
        action: 'sandbox_run',
        target: result.target,
        ok: result.ok,
        meta: { ms: result.ms, live: liveOk, kind, error: result.error ?? null },
      }).catch(() => undefined);

      return result;
    },
    onSuccess: (r) => {
      setLast(r);
      if (r.ok) showSuccess(`نجح ${r.target} · ${r.ms}ms`);
      else showError(new Error(r.error || 'فشل الاختبار'));
    },
    onError: (e: Error) => showError(e),
  });

  const tests = [
    { id: 'jobs-ping', label: 'Jobs Worker', desc: 'استدعاء عامل المهام (آمن نسبياً)' },
    { id: 'whatsapp-status', label: 'WhatsApp Status', desc: 'قراءة حالة الخادم فقط — بدون إرسال' },
    { id: 'ai-usage-rpc', label: 'AI Usage RPC', desc: 'فحص صلاحية إحصاءات AI' },
    { id: 'db-tables', label: 'قائمة الجداول', desc: 'فحص RPC مستكشف القاعدة' },
  ];

  return (
    <RolePageShell>
      <PageHeader
        title="Developer Sandbox"
        subtitle="اختبارات معزولة قدر الإمكان — dry-run افتراضياً · يُسجَّل في Audit"
        icon={FlaskConical}
      />

      <HorizonCard className="mb-4 border border-amber-500/25">
        <p className="text-sm text-amber-100/90 leading-relaxed">
          ممنوع استخدام هذه الصفحة كبديل لشاشات المدير. لا بث واتساب جماعي ولا خصم رصيد معلمين من هنا.
          فعّل «استدعاءات حية» فقط عند الحاجة وبعد ضبط علم <code className="text-xs">sandbox_live_calls</code>.
        </p>
        <label className="flex items-center gap-2 mt-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={allowLive}
            onChange={(e) => setAllowLive(e.target.checked)}
            className="rounded border-white/20"
          />
          السماح باستدعاءات حية في هذه الجلسة (مع العلم النظامي)
        </label>
      </HorizonCard>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {tests.map((t) => (
          <HorizonCard key={t.id} className="!p-4">
            <p className="text-sm font-semibold text-white">{t.label}</p>
            <p className="text-xs text-surface-muted mt-1 mb-3">{t.desc}</p>
            <Button
              size="sm"
              variant="secondary"
              disabled={runMut.isPending}
              onClick={() => runMut.mutate(t.id)}
            >
              تشغيل اختبار
            </Button>
          </HorizonCard>
        ))}
      </div>

      {last && (
        <HorizonCard>
          <p className="text-sm font-medium text-white mb-2">
            آخر نتيجة:{' '}
            <span className={clsx(last.ok ? 'text-emerald-300' : 'text-red-300')}>
              {last.target} · {last.ms}ms
            </span>
          </p>
          <pre className="text-[11px] text-white/70 bg-black/30 rounded-xl p-3 overflow-auto max-h-72">
            {JSON.stringify(last.error ? { error: last.error } : last.body, null, 2)}
          </pre>
        </HorizonCard>
      )}
    </RolePageShell>
  );
}
