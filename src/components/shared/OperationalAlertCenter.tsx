import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, ArrowLeft, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import type { OperationalAlert } from '../../lib/operationalAlerts';
import { HorizonCard } from '../dashboard/horizon/HorizonDashboard';
import { useAuthStore } from '../../stores/authStore';
import type { UserRole } from '../../types';

const PRINCIPAL_ACTION_PATHS: Record<string, string> = {
  '/admin/points': '/principal/executive',
};

function resolveAlertAction(
  alert: OperationalAlert,
  role: UserRole | null,
): { path?: string; label?: string } {
  if (!alert.actionPath || !alert.actionLabel) return {};

  if (role === 'principal') {
    const path = PRINCIPAL_ACTION_PATHS[alert.actionPath] ?? alert.actionPath;
    const label =
      alert.actionPath === '/admin/points' ? 'عرض الملخص' : alert.actionLabel;
    return { path, label };
  }

  return { path: alert.actionPath, label: alert.actionLabel };
}

const SEVERITY_STYLES: Record<
  OperationalAlert['severity'],
  { border: string; icon: string; bg: string }
> = {
  critical: {
    border: 'border-red-500/30',
    icon: 'text-red-400',
    bg: 'bg-red-500/10',
  },
  warning: {
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  info: {
    border: 'border-blue-500/25',
    icon: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
};

type Props = {
  alerts: OperationalAlert[];
  title?: string;
  subtitle?: string;
};

export function OperationalAlertCenter({
  alerts,
  title = 'مركز التنبيهات',
  subtitle = 'متابعة تشغيلية — فصول بلا نشاط، معلمون خامدون، طلبات معلّقة',
}: Props) {
  const { role } = useAuthStore();

  return (
    <HorizonCard>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-sm text-[#A3AED0] mt-0.5">{subtitle}</p>
          </div>
        </div>
        {alerts.length === 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3.5 h-3.5" />
            لا تنبيهات حرجة
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-[#A3AED0]">
          كل الفصول نشطة هذا الأسبوع، والمعلمون يمنحون النقاط، ولا توجد طلبات معلّقة كثيرة.
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const style = SEVERITY_STYLES[alert.severity];
            const action = resolveAlertAction(alert, role);
            return (
              <div
                key={alert.id}
                className={clsx(
                  'rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                  style.border,
                  style.bg,
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <AlertTriangle className={clsx('w-5 h-5 shrink-0 mt-0.5', style.icon)} />
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm">{alert.title}</p>
                    <p className="text-xs text-[#A3AED0] mt-1 leading-relaxed">{alert.detail}</p>
                  </div>
                </div>
                {action.path && action.label && (
                  <Link
                    to={action.path}
                    className="inline-flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-xs font-semibold bg-white/[0.08] text-white hover:bg-white/[0.12] transition-colors"
                  >
                    {action.label}
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </HorizonCard>
  );
}
