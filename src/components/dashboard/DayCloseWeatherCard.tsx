import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sunset } from 'lucide-react';
import { HorizonCard } from '../dashboard/horizon/HorizonDashboard';
import { fetchOperationalAlertData } from '../../lib/operationalAlerts';
import { buildDayCloseItems } from '../../lib/wave3Ops';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';

/** R — طقس إغلاق يوم/أسبوع */
export function DayCloseWeatherCard() {
  const alertsQuery = useQuery({
    queryKey: ['operational-alerts'],
    queryFn: fetchOperationalAlertData,
    refetchInterval: 60_000,
  });

  const pendingQuery = useQuery({
    queryKey: ['wave3', 'pending-approvals'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('points_ledger')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) return 0;
      return count ?? 0;
    },
    retry: false,
  });

  const homeworkQuery = useQuery({
    queryKey: ['wave3', 'homework-today'],
    queryFn: async () => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
      const { count, error } = await supabase
        .from('academic_homeworks')
        .select('*', { count: 'exact', head: true })
        .eq('date', today);
      if (error) return 0;
      return count ?? 0;
    },
    retry: false,
  });

  const healthQuery = useQuery({
    queryKey: ['school', 'ops-health'],
    queryFn: async () => {
      const { fetchSchoolOpsHealth } = await import('../../lib/wave3Ops');
      return fetchSchoolOpsHealth();
    },
    retry: false,
  });

  const items = buildDayCloseItems({
    alertCount: alertsQuery.data?.alerts?.length ?? 0,
    pendingApprovals: pendingQuery.data ?? 0,
    homeworkToday: homeworkQuery.data ?? 0,
    criticalErrors: healthQuery.data?.critical_errors ?? 0,
  });

  return (
    <HorizonCard>
      <div className="flex items-center gap-2 mb-3">
        <Sunset className="w-5 h-5 text-amber-300" />
        <div>
          <p className="text-sm font-semibold text-white">طقس إغلاق اليوم / الأسبوع</p>
          <p className="text-[11px] text-surface-muted">قائمة تحقق تشغيلية — قراءة فقط</p>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={item.href ?? '/dashboard'}
              className={clsx(
                'block text-xs rounded-xl px-3 py-2 border',
                item.tone === 'ok' && 'border-emerald-500/20 bg-emerald-500/5 text-emerald-100/90',
                item.tone === 'warn' && 'border-amber-500/25 bg-amber-500/10 text-amber-100',
                item.tone === 'info' && 'border-white/10 bg-white/[0.03] text-white/70',
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </HorizonCard>
  );
}
