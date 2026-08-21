import clsx from 'clsx';
import { User } from 'lucide-react';
import { useParentChildren } from '../../hooks/useParentChildren';
import { TapHandLoader } from '../ui/TapHandLoader';

type Props = {
  className?: string;
  /** إخفاء الشريط إن لم يوجد أبناء (افتراضي: true) */
  hideWhenEmpty?: boolean;
};

/**
 * شريط ابن ثابت — اختيار متسق عبر بوابة ولي الأمر عبر parentChildStore.
 */
export function ParentChildBar({ className, hideWhenEmpty = true }: Props) {
  const { children, selectedChild, selectedChildId, setSelectedChildId, isLoading } = useParentChildren();

  if (isLoading && children.length === 0) {
    return (
      <div className={clsx('rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3', className)}>
        <TapHandLoader label="جاري تحميل الأبناء..." />
      </div>
    );
  }

  if (children.length === 0) {
    if (hideWhenEmpty) return null;
    return (
      <div className={clsx('rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100', className)}>
        لا يوجد أبناء مرتبطون — اربط طالباً من قائمة «ربط طالب بكود»
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'sticky top-0 z-10 -mx-1 px-1 py-1',
        className,
      )}
      dir="rtl"
    >
      <div className="rounded-2xl border border-white/10 bg-[var(--surface-elevated)] backdrop-blur-md px-3 py-2.5 sm:px-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center text-navy-950 font-bold shrink-0">
              {selectedChild?.full_name?.charAt(0) ?? <User className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-surface-muted font-medium">الابن المتابع</p>
              <p className="text-sm font-bold text-white truncate">
                {selectedChild?.full_name ?? '—'}
              </p>
              {selectedChild && (
                <p className="text-[11px] text-gold-400/90 truncate">
                  {selectedChild.grade} — {selectedChild.class_name}
                </p>
              )}
            </div>
          </div>

          {children.length > 1 && (
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto sm:justify-end">
              {children.map((c) => {
                const active = c.id === selectedChildId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedChildId(c.id)}
                    className={clsx(
                      'px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors min-h-[36px]',
                      active
                        ? 'bg-gold-500 text-navy-950'
                        : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white',
                    )}
                  >
                    {c.full_name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
