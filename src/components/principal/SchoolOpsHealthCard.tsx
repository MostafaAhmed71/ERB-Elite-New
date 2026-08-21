import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { HorizonCard } from '../dashboard/horizon/HorizonDashboard';
import { fetchSchoolOpsHealth } from '../../lib/wave3Ops';
import { useAuthStore } from '../../stores/authStore';
import clsx from 'clsx';

/** W — ملخص صحة تشغيل للمدرسة (ليس /dev الكامل) */
export function SchoolOpsHealthCard() {
  const role = useAuthStore((s) => s.role);
  const isDev = role === 'platform_developer';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['school', 'ops-health'],
    queryFn: fetchSchoolOpsHealth,
    refetchInterval: 60_000,
    retry: false,
  });

  if (isError) return null;

  const tone =
    (data?.critical_errors ?? 0) > 0 || (data?.failed_jobs ?? 0) > 3
      ? 'warn'
      : (data?.open_errors ?? 0) > 0 || (data?.ai_failed_24h ?? 0) > 5
        ? 'caution'
        : 'ok';

  return (
    <HorizonCard
      className={clsx(
        'border',
        tone === 'warn' && 'border-red-500/30',
        tone === 'caution' && 'border-amber-500/30',
        tone === 'ok' && 'border-emerald-500/20',
      )}
    >
      <div className="flex items-start gap-3">
        <Activity className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">صحة التشغيل المدرسية</p>
          <p className="text-xs text-surface-muted mt-1">
            {isLoading
              ? 'جاري الفحص…'
              : (data?.critical_errors ?? 0) > 0
                ? `تنبيه: ${data?.critical_errors} خطأ حرج مفتوح — راجع التشغيل أو تواصل مع مطور المنصة`
                : `أخطاء: ${data?.open_errors ?? 0} · مهام فاشلة: ${data?.failed_jobs ?? 0} · معرفة للمراجعة: ${data?.knowledge_needs_review ?? 0} · واجبات اليوم: ${data?.homework_today ?? 0}`}
          </p>
          <p className="text-[11px] text-white/40 mt-1">
            AI اليوم: {data?.ai_success_24h ?? 0} نجاح / {data?.ai_failed_24h ?? 0} فشل
            {(data?.pending_points ?? 0) > 0 ? ` · نقاط معلّقة: ${data?.pending_points}` : ''}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              to={data?.links.whatsapp_reminders ?? '/principal/academic/whatsapp-reminders'}
              className="text-[11px] text-gold-400 hover:underline"
            >
              تذكيرات واتساب
            </Link>
            <Link
              to={data?.links.ai_settings ?? '/principal/ai-settings'}
              className="text-[11px] text-gold-400 hover:underline"
            >
              إعدادات AI
            </Link>
            <Link to="/points/approve" className="text-[11px] text-gold-400 hover:underline">
              اعتماد النقاط
            </Link>
            <Link to="/dashboard" className="text-[11px] text-gold-400 hover:underline">
              صندوق اليوم
            </Link>
            {isDev && (
              <>
                <Link to="/dev/health" className="text-[11px] text-emerald-400 hover:underline">
                  /dev صحة
                </Link>
                <Link to="/dev/errors" className="text-[11px] text-emerald-400 hover:underline">
                  /dev أخطاء
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </HorizonCard>
  );
}
