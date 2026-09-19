import { useEffect, useId, useRef, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import clsx from 'clsx';
import { THEME_LABELS, THEME_OPTIONS, type ThemePreference } from '../../lib/theme';
import { useThemeStore } from '../../stores/themeStore';

const ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

type Props = {
  /** قائمة راديو كاملة بعنوان «المظهر» */
  variant?: 'panel' | 'compact' | 'icon';
  className?: string;
};

export function ThemeAppearanceControl({ variant = 'panel', className }: Props) {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const groupId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (variant === 'panel') {
    return (
      <fieldset
        className={clsx(
          'rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3',
          className,
        )}
        dir="rtl"
      >
        <legend className="px-1 text-sm font-bold text-[var(--text-primary)]">المظهر</legend>
        <div className="space-y-2" role="radiogroup" aria-label="المظهر">
          {THEME_OPTIONS.map((option) => {
            const Icon = ICONS[option];
            const selected = preference === option;
            return (
              <label
                key={option}
                className={clsx(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors min-h-[44px]',
                  selected
                    ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]'
                    : 'border-[var(--border)] hover:bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]',
                )}
              >
                <input
                  type="radio"
                  name={groupId}
                  value={option}
                  checked={selected}
                  onChange={() => setPreference(option)}
                  className="accent-[var(--accent)] w-4 h-4 shrink-0"
                />
                <Icon className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {THEME_LABELS[option]}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={clsx('space-y-1.5', className)} dir="rtl">
        <p className="text-[10px] font-semibold text-[var(--text-secondary)] px-1">المظهر</p>
        <div
          className="flex rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_3%,transparent)] p-1 gap-0.5"
          role="radiogroup"
          aria-label="المظهر"
        >
          {THEME_OPTIONS.map((option) => {
            const Icon = ICONS[option];
            const selected = preference === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                title={THEME_LABELS[option]}
                onClick={() => setPreference(option)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[10px] font-semibold min-h-[36px] transition-colors',
                  selected
                    ? 'bg-[var(--primary)] text-on-contrast dark:bg-[var(--accent)] dark:text-navy-950'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                )}
              >
                <Icon
                  className={clsx(
                    'w-3.5 h-3.5 shrink-0',
                    selected && 'text-on-contrast dark:text-navy-950',
                  )}
                />
                <span className={clsx('hidden xl:inline', selected && 'text-on-contrast dark:text-navy-950')}>
                  {THEME_LABELS[option]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* icon — قائمة منبثقة للهيدر */
  return (
    <div ref={rootRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="المظهر"
        aria-label="المظهر"
        aria-expanded={open}
        className="flex p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] transition-all min-w-[44px] min-h-[44px] items-center justify-center"
      >
        {preference === 'dark' ? (
          <Moon className="w-5 h-5" />
        ) : preference === 'system' ? (
          <Monitor className="w-5 h-5" />
        ) : (
          <Sun className="w-5 h-5" />
        )}
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-50 w-52 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg"
          role="radiogroup"
          aria-label="المظهر"
          dir="rtl"
        >
          <p className="px-2 py-1.5 text-xs font-bold text-[var(--text-primary)]">المظهر</p>
          {THEME_OPTIONS.map((option) => {
            const Icon = ICONS[option];
            const selected = preference === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setPreference(option);
                  setOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-sm font-semibold min-h-[44px] transition-colors',
                  selected
                    ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--primary)_4%,transparent)] hover:text-[var(--text-primary)]',
                )}
              >
                <span
                  className={clsx(
                    'w-3.5 h-3.5 rounded-full border-2 shrink-0',
                    selected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border)]',
                  )}
                />
                <Icon className="w-4 h-4 shrink-0" />
                {THEME_LABELS[option]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
