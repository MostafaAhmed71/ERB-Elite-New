import clsx from 'clsx';
import { Trophy, BookOpen } from 'lucide-react';
import type { TeacherAppMode } from '../../lib/teacherMode';
import { TEACHER_MODE_LABELS } from '../../lib/teacherMode';

type Props = {
  mode: TeacherAppMode;
  onChange: (mode: TeacherAppMode) => void;
  compact?: boolean;
  className?: string;
  /** إخفاء خيار الأولمبياد (معلمو الثانوية فقط) */
  olympiadEnabled?: boolean;
};

const MODES: { id: TeacherAppMode; icon: typeof Trophy }[] = [
  { id: 'olympiad', icon: Trophy },
  { id: 'academic', icon: BookOpen },
];

export function TeacherModeToggle({
  mode,
  onChange,
  compact,
  className,
  olympiadEnabled = true,
}: Props) {
  const modes = olympiadEnabled ? MODES : MODES.filter((m) => m.id === 'academic');

  // إن كان الوضع أولمبياد وهو معطّل — اعرض الأكاديمي كنشط بصريًا
  const displayMode = !olympiadEnabled && mode === 'olympiad' ? 'academic' : mode;

  if (modes.length === 1) {
    return (
      <div
        className={clsx(
          'inline-flex rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-[#A3AED0]',
          className,
        )}
        title="الأولمبياد متاح لمعلمي المرحلة المتوسطة فقط"
      >
        <BookOpen className="w-4 h-4 ml-1.5 text-[#7551FF]" />
        {TEACHER_MODE_LABELS.academic}
        <span className="text-[10px] text-white/35 mr-2 font-normal">— متوسط فقط للأولمبياد</span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1 gap-1',
        className,
      )}
      role="tablist"
      aria-label="اختر المنصة"
    >
      {modes.map(({ id, icon: Icon }) => {
        const active = displayMode === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={clsx(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg font-semibold transition-all min-h-[40px]',
              compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-4 py-2 text-sm',
              active
                ? id === 'olympiad'
                  ? 'bg-gold-500 text-navy-950 shadow-md shadow-gold-500/25'
                  : 'bg-[var(--primary)] text-on-contrast shadow-md shadow-[rgba(15,39,68,0.25)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]',
            )}
          >
            <Icon className={clsx('shrink-0', compact ? 'w-3.5 h-3.5' : 'w-4 h-4', active && id !== 'olympiad' && 'text-on-contrast')} />
            <span className={clsx(active && id !== 'olympiad' && 'text-on-contrast')}>{TEACHER_MODE_LABELS[id]}</span>
          </button>
        );
      })}
    </div>
  );
}
