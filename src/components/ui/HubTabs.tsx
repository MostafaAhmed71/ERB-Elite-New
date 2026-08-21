import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

export type HubTabItem<T extends string = string> = {
  id: T;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
};

type HubTabsProps<T extends string = string> = {
  tabs: HubTabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  /** aria label لمجموعة التبويبات */
  ariaLabel?: string;
};

/**
 * تبويبات مركز (Hub) موحّدة — للدمج الناعم في Phase 3 دون تكرار أنماط محلية.
 */
export function HubTabs<T extends string = string>({
  tabs,
  activeId,
  onChange,
  className,
  ariaLabel = 'أقسام الصفحة',
}: HubTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={clsx(
        'flex gap-1 sm:gap-2 border-b border-[var(--border-subtle)] pb-0.5 flex-wrap overflow-x-auto overscroll-x-contain',
        className,
      )}
    >
      {tabs.map(({ id, label, icon: Icon, badge }) => {
        const active = id === activeId;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={clsx(
              'flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px whitespace-nowrap touch-target',
              active
                ? 'border-[var(--gold-400)] text-[var(--gold-400)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-white/80',
            )}
          >
            {Icon ? <Icon className="w-4 h-4 shrink-0" /> : null}
            <span>{label}</span>
            {badge != null && badge !== '' && (
              <span
                className={clsx(
                  'text-[10px] px-1.5 py-0.5 rounded-full border',
                  active
                    ? 'bg-gold-500/15 text-gold-300 border-gold-500/30'
                    : 'bg-white/5 text-white/50 border-white/10',
                )}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
