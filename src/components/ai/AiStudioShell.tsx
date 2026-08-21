import { useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ChevronLeft, MoreHorizontal, type LucideIcon } from 'lucide-react';

/** Full-bleed AI workspace shell — ChatGPT/Claude-like canvas inside the school theme */
export function AiStudioShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('relative min-h-[calc(100dvh-6rem)] w-full min-w-0 pb-20 lg:pb-4', className)}>
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 85% -5%, rgba(240,180,41,0.10) 0%, transparent 55%), radial-gradient(ellipse 55% 40% at 5% 20%, rgba(1,181,116,0.07) 0%, transparent 50%), radial-gradient(ellipse 50% 35% at 50% 100%, rgba(68,129,235,0.06) 0%, transparent 55%)',
        }}
      />
      {children}
    </div>
  );
}

export function AiStudioHeader({
  title,
  subtitle,
  backTo,
  backLabel = 'رجوع',
  badge,
  actions,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  badge?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-start sm:justify-between mb-3 sm:mb-5">
      <div className="min-w-0">
        {backTo && (
          <Link
            to={backTo}
            className="inline-flex items-center gap-1 text-sm text-[#A3AED0] hover:text-gold-400 mb-1 sm:mb-2 transition-colors min-h-[44px] sm:min-h-0"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
            {backLabel}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="ai-orb w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0">
            <span className="ai-orb-core" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">{title}</h1>
              {badge && (
                <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md bg-gold-500/15 text-gold-400 border border-gold-500/25">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="hidden sm:block text-[#A3AED0] text-sm mt-0.5 max-w-xl leading-relaxed">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
      {actions && <div className="shrink-0 w-full sm:w-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function AiNavRail({
  items,
  active,
  onChange,
  className,
  mobilePrimaryCount = 3,
}: {
  items: { id: string; label: string; icon: LucideIcon; hint?: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  /** على الجوال: عدد التبويبات الظاهرة قبل «المزيد» */
  mobilePrimaryCount?: number;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = items.slice(0, mobilePrimaryCount);
  const overflow = items.slice(mobilePrimaryCount);
  const activeInOverflow = overflow.some((i) => i.id === active);

  const renderBtn = (item: (typeof items)[0], fullWidth?: boolean) => {
    const Icon = item.icon;
    const isActive = active === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onChange(item.id);
          setMoreOpen(false);
        }}
        className={clsx(
          'group relative inline-flex items-center gap-1.5 shrink-0',
          fullWidth ? 'w-full flex-row' : 'flex-col lg:flex-row lg:w-full lg:gap-2',
          'px-2 py-2 min-h-[52px] lg:min-h-0 lg:px-3 lg:py-2.5 rounded-xl text-[10px] lg:text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(240,180,41,0.35)]'
            : 'text-[#A3AED0] hover:bg-white/[0.04] hover:text-white',
        )}
      >
        {isActive && (
          <span className="hidden lg:block absolute end-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gold-400" />
        )}
        <span
          className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
            isActive ? 'bg-gold-500/20 text-gold-400' : 'bg-white/[0.04] text-[#A3AED0] group-hover:text-white',
          )}
        >
          <Icon className="w-4 h-4" strokeWidth={2} />
        </span>
        <span className="whitespace-nowrap">{item.label}</span>
      </button>
    );
  };

  return (
    <div className={clsx('relative', className)}>
      {/* جوال: شبكة مضغوطة */}
      <nav className="grid grid-cols-4 gap-1 lg:hidden" aria-label="أقسام المساعد">
        {primary.map((item) => renderBtn(item))}
        {overflow.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={clsx(
              'inline-flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl px-2 py-2.5 min-h-[48px] text-xs font-medium',
              moreOpen || activeInOverflow
                ? 'bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(240,180,41,0.35)]'
                : 'text-[#A3AED0] bg-white/[0.03]',
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>المزيد</span>
          </button>
        )}
      </nav>
      {moreOpen && overflow.length > 0 && (
        <div className="lg:hidden mt-2 rounded-xl border border-white/10 bg-[#0d1b2e] p-1.5 space-y-0.5 z-20 relative">
          {overflow.map((item) => renderBtn(item, true))}
        </div>
      )}

      {/* سطح المكتب: عمود كامل */}
      <nav className="hidden lg:flex lg:flex-col gap-1" aria-label="أقسام المساعد">
        {items.map((item) => renderBtn(item, true))}
      </nav>
    </div>
  );
}

export function AiCreditPill({
  remaining,
  monthly,
  bonus,
  used,
  compact,
}: {
  remaining: number;
  monthly: number;
  bonus: number;
  used: number;
  compact?: boolean;
}) {
  const total = monthly + bonus;
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const empty = remaining <= 0;
  const low = !empty && pct >= 80;

  return (
    <div
      className={clsx(
        'rounded-2xl border backdrop-blur-sm',
        empty
          ? 'border-red-400/30 bg-red-500/10'
          : low
            ? 'border-amber-400/30 bg-amber-500/10'
            : 'border-white/10 bg-white/[0.04]',
        compact ? 'px-3 py-1.5 sm:py-2 w-full sm:w-auto' : 'px-4 py-3 min-w-[160px]',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={clsx('text-xs font-medium', empty ? 'text-red-300' : 'text-[#A3AED0]')}>
          الرصيد
        </span>
        <span
          className={clsx(
            'text-sm font-bold tabular-nums',
            empty ? 'text-red-300' : low ? 'text-amber-300' : 'text-white',
          )}
        >
          {remaining}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            empty ? 'bg-red-400' : low ? 'bg-amber-400' : 'bg-gradient-to-l from-gold-400 to-[#01B574]',
          )}
          style={{ width: `${Math.max(2, 100 - pct)}%` }}
        />
      </div>
      {!compact && (
        <p className="text-[10px] text-[#A3AED0]/80 mt-1.5 tabular-nums">
          شهري {monthly} · إضافي {bonus} · مستهلك {used}
        </p>
      )}
    </div>
  );
}

export function AiPanel({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={clsx(
        'ai-panel rounded-2xl sm:rounded-[22px] border border-white/[0.07] bg-[#0d1535]/80 backdrop-blur-md shadow-[0_24px_60px_rgba(0,0,0,0.35)]',
        padded && 'p-4 sm:p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AiGeneratingState({ label = 'يفكّر…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-4">
      <div className="ai-orb ai-orb--lg w-16 h-16 rounded-3xl flex items-center justify-center">
        <span className="ai-orb-core" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white/90 text-sm font-medium">{label}</span>
        <span className="ai-typing-dots" aria-hidden>
          <i /><i /><i />
        </span>
      </div>
      <p className="text-[#A3AED0] text-xs text-center max-w-xs">
        جارٍ صياغة المحتوى وفق بياناتك وسياسة المدرسة
      </p>
    </div>
  );
}

export function AiEmptyHero({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-5 sm:py-14 px-3 sm:px-4">
      <div className="ai-orb ai-orb--lg w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[28px] flex items-center justify-center mb-3 sm:mb-5 ai-orb--float">
        <span className="ai-orb-core" />
      </div>
      <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight max-w-md">{title}</h2>
      <p className="text-[#A3AED0] text-xs sm:text-sm mt-1.5 sm:mt-2 max-w-md leading-relaxed px-1">{subtitle}</p>
      {children && <div className="mt-4 sm:mt-8 w-full max-w-2xl">{children}</div>}
    </div>
  );
}

export function AiSuggestionChip({
  label,
  description,
  onClick,
  credit,
}: {
  label: string;
  description?: string | null;
  onClick: () => void;
  credit?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-right rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-gold-500/30 p-3.5 sm:p-4 min-h-[56px] transition-all duration-200 active:scale-[0.98]"
    >
      <span className="block text-white text-sm font-semibold group-hover:text-gold-400 transition-colors">
        {label}
      </span>
      {description && (
        <span className="block text-[11px] text-[#A3AED0] mt-1 line-clamp-2 leading-relaxed">
          {description}
        </span>
      )}
      {credit != null && (
        <span className="inline-block mt-2 text-[10px] font-semibold text-gold-400/90 bg-gold-500/10 px-2 py-0.5 rounded-md">
          {credit} نقطة
        </span>
      )}
    </button>
  );
}

export function AiComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  pending,
  submitLabel = 'إرسال',
  secondary,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  pending?: boolean;
  submitLabel?: string;
  secondary?: React.ReactNode;
  rows?: number;
}) {
  return (
    <div className="ai-composer rounded-2xl sm:rounded-[24px] border border-white/10 bg-[#111c44]/90 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.4)] p-2 sm:p-2.5">
      <textarea
        className="w-full bg-transparent text-white text-sm leading-relaxed placeholder:text-[#A3AED0]/60 resize-none outline-none px-3 pt-2.5 pb-1 min-h-[72px] max-h-[200px]"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || pending}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !disabled && !pending && value.trim()) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 px-1.5 pb-1 pt-1">
        <div className="flex flex-wrap gap-1.5">{secondary}</div>
        <button
          type="button"
          disabled={disabled || pending || !value.trim()}
          onClick={onSubmit}
          className={clsx(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all',
            'bg-gradient-to-l from-gold-500 to-gold-400 text-navy-950',
            'hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed',
            'shadow-lg shadow-gold-500/20',
          )}
        >
          {pending ? (
            <>
              <span className="ai-typing-dots ai-typing-dots--dark"><i /><i /><i /></span>
              جارٍ…
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </div>
  );
}

export function AiResultToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 opacity-90 overflow-x-auto overscroll-x-contain pb-1 -mx-1 px-1 max-w-full">
      {children}
    </div>
  );
}

export function AiToolBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 sm:py-1.5 text-xs font-medium text-[#A3AED0] hover:text-white hover:bg-white/[0.06] disabled:opacity-35 disabled:cursor-not-allowed transition-colors min-h-[44px] sm:min-h-0 shrink-0"
    >
      <Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
      {label}
    </button>
  );
}

export function AiSectionLabel({
  icon: Icon,
  children,
  action,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2 text-white font-semibold text-sm">
        {Icon && (
          <span className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-gold-400">
            <Icon className="w-3.5 h-3.5" />
          </span>
        )}
        {children}
      </div>
      {action}
    </div>
  );
}
