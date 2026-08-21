import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

type NavSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
  /** عند طي السايدبار يُخفى العنوان */
  collapsed?: boolean;
  /** طي المجموعة (أكورديون) — إن وُجد يُفعَّل الزر */
  open?: boolean;
  onToggle?: () => void;
};

/**
 * عنوان مجموعة في القائمة الجانبية — جاهز لـ Phase 2 (Navigation IA).
 */
export function NavSection({
  title,
  children,
  className,
  collapsed = false,
  open = true,
  onToggle,
}: NavSectionProps) {
  const collapsible = typeof onToggle === 'function' && !collapsed;

  return (
    <div className={clsx('space-y-0.5', className)}>
      {!collapsed && (
        collapsible ? (
          <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-between gap-2 px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wide text-[var(--text-muted)] uppercase hover:text-white/70 transition-colors"
            aria-expanded={open}
          >
            <span>{title}</span>
            <ChevronDown
              className={clsx('w-3.5 h-3.5 shrink-0 transition-transform', open && 'rotate-180')}
            />
          </button>
        ) : (
          <p className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
            {title}
          </p>
        )
      )}
      {collapsed && <div className="my-2 mx-3 border-t border-[var(--border-subtle)]" aria-hidden />}
      {(collapsed || open) && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}
