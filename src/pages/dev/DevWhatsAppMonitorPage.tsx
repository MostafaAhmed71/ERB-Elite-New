import { useQuery } from '@tanstack/react-query';
import { MessageSquare, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { fetchWhatsAppServerStatus } from '../../lib/whatsappReminder';
import clsx from 'clsx';

export function DevWhatsAppMonitorPage() {
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['dev', 'monitor', 'whatsapp'],
    queryFn: fetchWhatsAppServerStatus,
    refetchInterval: 20_000,
  });

  return (
    <RolePageShell>
      <PageHeader
        title="مراقبة WhatsApp"
        subtitle="حالة خادم WPPConnect — للمطور فقط"
        icon={MessageSquare}
        actions={
          <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>
            تحديث
          </Button>
        }
      />

      {isLoading ? (
        <TapHandLoader label="جاري فحص خادم واتساب..." />
      ) : error ? (
        <HorizonCard className="border border-red-500/30 bg-red-500/10">
          <p className="text-red-200 text-sm">{error instanceof Error ? error.message : 'خطأ غير معروف'}</p>
        </HorizonCard>
      ) : data ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <HorizonCard
            className={clsx(
              'border',
              data.connected ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10',
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              {data.connected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-amber-400" />
              )}
              <p className="text-lg font-bold text-white">
                {data.connected ? 'الجلسة متصلة' : 'غير متصل / غير مربوط'}
              </p>
            </div>
            <p className="text-sm text-surface-muted">الحالة: {data.status}</p>
            {data.version != null && (
              <p className="text-sm text-surface-muted mt-1">إصدار الخادم: {data.version}</p>
            )}
          </HorizonCard>

          <HorizonCard>
            <p className="text-xs text-surface-muted mb-1">عنوان API</p>
            <p className="text-sm font-mono text-emerald-300/90 break-all">{data.apiBase}</p>
            <a
              href={`${data.apiBase}/qr`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gold-400 mt-3 hover:underline"
            >
              فتح صفحة QR
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </HorizonCard>

          <HorizonCard className="sm:col-span-2">
            <p className="text-sm font-semibold text-white mb-2">القدرات</p>
            <ul className="text-sm text-surface-muted space-y-1">
              <li>
                تذكيرات نصية:{' '}
                <span className={data.supportsTextReminders ? 'text-emerald-300' : 'text-amber-300'}>
                  {data.supportsTextReminders ? 'مدعومة' : 'غير متاحة — حدّث الخادم'}
                </span>
              </li>
              <li className="text-xs text-white/35 mt-2">
                لا يُرسل من هذه الشاشة بثاً لأولياء/معلمين — استخدم Sandbox لاحقاً لأهداف اختبار فقط.
              </li>
            </ul>
          </HorizonCard>
        </div>
      ) : null}
    </RolePageShell>
  );
}
