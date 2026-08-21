import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList } from 'lucide-react';
import clsx from 'clsx';
import { HorizonCard } from '../dashboard/horizon/HorizonDashboard';

export type DailyOpsItem = {
  id: string;
  title: string;
  detail?: string;
  to?: string;
  tone?: 'warn' | 'info' | 'ok';
};

type Props = {
  title?: string;
  items: DailyOpsItem[];
  emptyLabel?: string;
  className?: string;
};

/** صندوق عمل يومي — عرض فقط؛ التجميع من لوحات الأدوار */
export function DailyOpsInbox({
  title = 'مهام اليوم',
  items,
  emptyLabel = 'لا مهام عاجلة الآن — أحسنت',
  className,
}: Props) {
  return (
    <HorizonCard className={clsx('border border-white/5', className)}>
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="w-5 h-5 text-gold-400" />
        <h2 className="text-base font-bold text-white">{title}</h2>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-emerald-300/90 py-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{emptyLabel}</span>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const body = (
              <div
                className={clsx(
                  'flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                  item.tone === 'warn'
                    ? 'border-amber-500/25 bg-amber-500/10'
                    : item.tone === 'ok'
                      ? 'border-emerald-500/20 bg-emerald-500/10'
                      : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.05]',
                )}
              >
                <AlertTriangle
                  className={clsx(
                    'w-4 h-4 mt-0.5 shrink-0',
                    item.tone === 'warn' ? 'text-amber-300' : 'text-gold-400/80',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  {item.detail && <p className="text-xs text-surface-muted mt-0.5">{item.detail}</p>}
                </div>
                {item.to && <ArrowLeft className="w-4 h-4 text-white/35 shrink-0 mt-0.5" />}
              </div>
            );
            return (
              <li key={item.id}>
                {item.to ? (
                  <Link to={item.to} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </HorizonCard>
  );
}
