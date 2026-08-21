import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import { GlassCard } from './GlassShell';

type Tint = 'purple' | 'cyan' | 'lime' | 'orange' | 'pink';

type GlassQuickActionProps = {
  to: string;
  label: string;
  icon: LucideIcon;
  tint?: Tint;
  description?: string;
  onClick?: () => void;
};

const TINT_CLASS: Record<Tint, string> = {
  purple: 'glass-icon-tint',
  cyan: 'glass-icon-tint--cyan',
  lime: 'glass-icon-tint--lime',
  orange: 'glass-icon-tint--orange',
  pink: 'glass-icon-tint--pink',
};

export function GlassQuickAction({
  to,
  label,
  icon: Icon,
  tint = 'purple',
  description,
  onClick,
}: GlassQuickActionProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="glass-quick-action flex flex-col items-center justify-center gap-2.5 p-3.5 sm:p-4 min-h-[104px] text-center"
    >
      <span
        className={clsx(
          'w-11 h-11 rounded-2xl flex items-center justify-center',
          TINT_CLASS[tint],
        )}
      >
        <Icon className="w-5 h-5" strokeWidth={2.25} />
      </span>
      <span className="text-xs sm:text-[13px] font-semibold text-white leading-snug line-clamp-2 font-cairo">
        {label}
      </span>
      {description && (
        <span className="text-[10px] text-[#A3AED0] line-clamp-1 hidden sm:block font-cairo">
          {description}
        </span>
      )}
    </Link>
  );
}

type GlassQuickGridProps = {
  children: ReactNode;
  className?: string;
};

export function GlassQuickGrid({ children, className }: GlassQuickGridProps) {
  return (
    <div className={clsx('grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3', className)}>
      {children}
    </div>
  );
}

export type GlassOpsItem = {
  id: string;
  title: string;
  detail?: string;
  to?: string;
  tone?: 'warn' | 'info' | 'ok';
};

type GlassOpsListProps = {
  title: string;
  items: GlassOpsItem[];
  emptyLabel?: string;
};

export function GlassOpsList({
  title,
  items,
  emptyLabel = 'لا مهام عاجلة الآن',
}: GlassOpsListProps) {
  return (
    <GlassCard className="h-full">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm sm:text-base font-bold text-white font-cairo">{title}</h3>
        <span className="text-[11px] font-semibold text-[#A3AED0] tabular-nums">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-[#01B574] font-medium py-4 font-cairo">{emptyLabel}</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((item) => {
            const tone =
              item.tone === 'warn' ? 'warn' : item.tone === 'ok' ? 'ok' : 'info';
            const inner = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate font-cairo">{item.title}</p>
                  {item.detail && (
                    <p className="text-[11px] text-[#A3AED0] truncate mt-0.5 font-cairo">{item.detail}</p>
                  )}
                </div>
                <span className={clsx('glass-status shrink-0', `glass-status--${tone}`)}>
                  {tone === 'warn' ? 'متابعة' : tone === 'ok' ? 'مكتمل' : 'معلومة'}
                </span>
                {item.to && <ArrowLeft className="w-4 h-4 text-[#A3AED0] shrink-0" />}
              </>
            );
            return (
              <li key={item.id}>
                {item.to ? (
                  <Link to={item.to} className="glass-ops-row">
                    {inner}
                  </Link>
                ) : (
                  <div className="glass-ops-row">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
