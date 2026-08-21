import { useEffect, useState } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { REALTIME_SUBSCRIPTIONS } from '../../lib/realtimeConfig';
import { supabase } from '../../lib/supabase';
import { pushDebugRealtime } from '../../lib/devDebugMode';
import clsx from 'clsx';

type ProbeState = 'idle' | 'connecting' | 'subscribed' | 'error';

export function DevRealtimeMonitorPage() {
  const [probe, setProbe] = useState<ProbeState>('idle');
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const run = async () => {
      setProbe('connecting');
      setErrorMsg(null);
      try {
        channel = supabase
          .channel('dev-realtime-probe')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'platform_errors' },
            (payload) => {
              const msg = `${payload.eventType} @ ${new Date().toLocaleTimeString('ar-SA')}`;
              setLastEvent(msg);
              pushDebugRealtime(`platform_errors ${payload.eventType}`);
            },
          )
          .subscribe((status) => {
            if (cancelled) return;
            if (status === 'SUBSCRIBED') setProbe('subscribed');
            else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setProbe('error');
              setErrorMsg(status);
            }
          });
      } catch (e) {
        if (!cancelled) {
          setProbe('error');
          setErrorMsg(e instanceof Error ? e.message : String(e));
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <RolePageShell>
      <PageHeader
        title="مراقبة Realtime"
        subtitle="حالة الاشتراك الحي · جداول React Query المرتبطة"
        icon={Radio}
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            إعادة فحص
          </Button>
        }
      />

      <HorizonCard
        className={clsx(
          'mb-4 border',
          probe === 'subscribed' && 'border-emerald-500/30',
          probe === 'error' && 'border-red-500/30',
          probe === 'connecting' && 'border-amber-500/30',
        )}
      >
        <p className="text-sm text-white font-semibold">مسبار الاشتراك</p>
        <p className="text-xs text-surface-muted mt-1">
          قناة تجريبية على <code className="text-white/60">platform_errors</code>
        </p>
        <p className="text-sm mt-3">
          الحالة:{' '}
          <span
            className={clsx(
              'font-bold',
              probe === 'subscribed' && 'text-emerald-300',
              probe === 'error' && 'text-red-300',
              probe === 'connecting' && 'text-amber-300',
              probe === 'idle' && 'text-white/50',
            )}
          >
            {probe === 'subscribed'
              ? 'مشترك'
              : probe === 'connecting'
                ? 'جاري الاتصال…'
                : probe === 'error'
                  ? 'خطأ'
                  : '—'}
          </span>
        </p>
        {lastEvent && <p className="text-xs text-cyan-200/80 mt-2">آخر حدث: {lastEvent}</p>}
        {errorMsg && <p className="text-xs text-red-300/90 mt-2">{errorMsg}</p>}
        <p className="text-[10px] text-white/35 mt-3">
          إن بقي «جاري الاتصال» تحقق من تفعيل Realtime على الجدول في Supabase.
        </p>
      </HorizonCard>

      <HorizonCard className="mb-4">
        <p className="text-sm text-surface-muted">
          عدد الجداول الموثّقة: <strong className="text-white">{REALTIME_SUBSCRIPTIONS.length}</strong>
        </p>
      </HorizonCard>

      <div className="space-y-2">
        {REALTIME_SUBSCRIPTIONS.map((s) => (
          <HorizonCard key={s.table} className="!p-3">
            <p className="text-sm text-white font-mono">{s.table}</p>
            <p className="text-[10px] text-surface-muted mt-1">
              {s.queryKeys.length} مفتاح استعلام مرتبط
            </p>
          </HorizonCard>
        ))}
      </div>
    </RolePageShell>
  );
}
