import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, XCircle, AlertTriangle, Database, MessageSquare, Sparkles, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { supabase } from '../../lib/supabase';
import { fetchWhatsAppServerStatus } from '../../lib/whatsappReminder';
import { getPlatformJobStats } from '../../lib/platformJobs';
import { getPlatformErrorStats } from '../../lib/platformErrors';
import clsx from 'clsx';

type HealthTone = 'ok' | 'warn' | 'bad' | 'unknown';

type HealthItem = {
  id: string;
  label: string;
  detail: string;
  tone: HealthTone;
  to?: string;
  icon: typeof Activity;
};

function toneClass(tone: HealthTone) {
  if (tone === 'ok') return 'border-emerald-500/30 bg-emerald-500/10';
  if (tone === 'warn') return 'border-amber-500/30 bg-amber-500/10';
  if (tone === 'bad') return 'border-red-500/30 bg-red-500/10';
  return 'border-white/10 bg-white/[0.03]';
}

function ToneIcon({ tone }: { tone: HealthTone }) {
  if (tone === 'ok') return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
  if (tone === 'warn') return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
  if (tone === 'bad') return <XCircle className="w-5 h-5 text-red-400 shrink-0" />;
  return <Activity className="w-5 h-5 text-white/40 shrink-0" />;
}

export function DevHealthPage() {
  const { data: dbOk, isLoading: dbLoading, isError: dbError } = useQuery({
    queryKey: ['dev', 'health', 'db'],
    queryFn: async () => {
      const { error } = await supabase.from('users').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return true;
    },
    refetchInterval: 60_000,
  });

  const { data: wa, isLoading: waLoading } = useQuery({
    queryKey: ['dev', 'health', 'whatsapp'],
    queryFn: fetchWhatsAppServerStatus,
    refetchInterval: 60_000,
  });

  const { data: jobStats, isLoading: jobsLoading } = useQuery({
    queryKey: ['dev', 'health', 'jobs'],
    queryFn: getPlatformJobStats,
    refetchInterval: 30_000,
    retry: false,
  });

  const { data: errStats, isLoading: errLoading } = useQuery({
    queryKey: ['dev', 'health', 'errors'],
    queryFn: getPlatformErrorStats,
    refetchInterval: 30_000,
    retry: false,
  });

  const items = useMemo((): HealthItem[] => {
    const list: HealthItem[] = [];

    list.push({
      id: 'db',
      label: 'Supabase / قاعدة البيانات',
      detail: dbLoading
        ? 'جاري الفحص...'
        : dbError
          ? 'تعذّر الاستعلام — تحقق من الاتصال وRLS'
          : dbOk
            ? 'الاتصال يعمل (استعلام users)'
            : 'حالة غير معروفة',
      tone: dbLoading ? 'unknown' : dbError ? 'bad' : 'ok',
      to: '/dev/monitor/supabase',
      icon: Database,
    });

    list.push({
      id: 'whatsapp',
      label: 'خادم واتساب',
      detail: waLoading
        ? 'جاري الفحص...'
        : !wa
          ? '—'
          : wa.status === 'offline'
            ? `غير متصل بالخادم (${wa.apiBase})`
            : wa.connected
              ? `متصل · ${wa.status}${wa.supportsTextReminders ? ' · تذكيرات نصية OK' : ' · يحتاج تحديث send-text'}`
              : `الخادم يرد لكن الجلسة غير مربوطة · ${wa.status}`,
      tone: waLoading
        ? 'unknown'
        : !wa || wa.status === 'offline'
          ? 'bad'
          : wa.connected
            ? wa.supportsTextReminders
              ? 'ok'
              : 'warn'
            : 'warn',
      to: '/dev/monitor/whatsapp',
      icon: MessageSquare,
    });

    const waiting = (jobStats?.queued ?? 0) + (jobStats?.retrying ?? 0);
    const failed = jobStats?.failed ?? 0;
    list.push({
      id: 'jobs',
      label: 'طابور المهام',
      detail: jobsLoading
        ? 'جاري الفحص...'
        : jobStats
          ? `انتظار ${waiting} · تشغيل ${jobStats.running} · فشل ${failed} · إجمالي ${jobStats.total}`
          : 'جدول المهام غير متاح بعد — طبّق migration 092',
      tone: jobsLoading
        ? 'unknown'
        : !jobStats
          ? 'warn'
          : failed > 0
            ? 'warn'
            : waiting > 20
              ? 'warn'
              : 'ok',
      to: '/dev/jobs',
      icon: Activity,
    });

    list.push({
      id: 'errors',
      label: 'مركز الأخطاء',
      detail: errLoading
        ? 'جاري الفحص...'
        : errStats
          ? `مفتوحة ${errStats.open} · حرجة ${errStats.critical} · آخر 24س ${errStats.last24h}`
          : 'جدول الأخطاء غير متاح — طبّق migration 093',
      tone: errLoading
        ? 'unknown'
        : !errStats
          ? 'warn'
          : errStats.critical > 0
            ? 'bad'
            : errStats.open > 0
              ? 'warn'
              : 'ok',
      to: '/dev/errors',
      icon: ShieldAlert,
    });

    list.push({
      id: 'ai',
      label: 'خدمات AI',
      detail: 'استخدام AI · آخر التوليدات — /dev/ai/usage',
      tone: 'unknown',
      to: '/dev/ai/usage',
      icon: Sparkles,
    });

    return list;
  }, [dbOk, dbLoading, dbError, wa, waLoading, jobStats, jobsLoading, errStats, errLoading]);

  return (
    <RolePageShell>
      <PageHeader
        title="صحة النظام"
        subtitle="فحص حي للخدمات الأساسية — بدون أسرار"
        icon={Activity}
      />

      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        {items.map((item) => {
          const body = (
            <HorizonCard className={clsx('border h-full', toneClass(item.tone))}>
              <div className="flex items-start gap-3">
                <ToneIcon tone={item.tone} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-gold-400/80" />
                    {item.label}
                  </p>
                  <p className="text-xs text-surface-muted mt-1.5 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            </HorizonCard>
          );
          return item.to ? (
            <Link key={item.id} to={item.to} className="block">
              {body}
            </Link>
          ) : (
            <div key={item.id}>{body}</div>
          );
        })}
      </div>

      {(dbLoading || waLoading) && (
        <div className="pt-2">
          <TapHandLoader label="جاري تحديث الحالة..." />
        </div>
      )}
    </RolePageShell>
  );
}
