import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { HorizonCard } from '../dashboard/horizon/HorizonDashboard';

type Props = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  /** عدد الإجراءات للعرض الجانبي */
  count?: number;
};

/** قسم أوامر في لوحة القيادة — فصل بصري بدون منطق أعمال */
export function CommandSection({ title, subtitle, icon: Icon, children, className, count }: Props) {
  return (
    <HorizonCard className={clsx('border border-white/5', className)}>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-start gap-2.5 min-w-0">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
              <Icon className="w-4.5 h-4.5 text-gold-400 w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-white">{title}</h2>
            {subtitle && <p className="text-xs sm:text-sm text-surface-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {count != null && (
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/[0.06] text-surface-muted">
            {count} إجراءات
          </span>
        )}
      </div>
      {children}
    </HorizonCard>
  );
}
