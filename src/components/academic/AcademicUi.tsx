import clsx from 'clsx';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, Inbox, ArrowRight } from 'lucide-react';
import { HorizonCard } from '../dashboard/horizon/HorizonDashboard';

/* ─── Layout ─── */
export function AcademicLayout({
  children,
  className,
  size = '6xl',
}: {
  children: React.ReactNode;
  className?: string;
  size?: 'md' | 'lg' | '2xl' | '4xl' | '5xl' | '6xl';
}) {
  const maxW = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
  }[size];

  return (
    <div className={clsx('relative min-h-full w-full min-w-0', className)}>
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 10% 0%, rgba(117,81,255,0.12) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(240,180,41,0.08) 0%, transparent 45%)',
        }}
      />
      <div className={clsx('py-1 sm:py-2 md:py-4 mx-auto w-full min-w-0', maxW)}>{children}</div>
    </div>
  );
}

/* ─── Header ─── */
type HeaderProps = {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  action?: React.ReactNode;
  badge?: string;
};

export function AcademicPageHeader({ title, subtitle, backTo, backLabel, action, badge }: HeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
      <div className="min-w-0">
        {backTo && (
          <Link
            to={backTo}
            className="inline-flex items-center gap-1 text-sm text-surface-muted hover:text-gold-400 mb-2 sm:mb-3 transition-colors min-h-[44px] sm:min-h-0"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
            {backLabel ?? 'رجوع'}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug">{title}</h1>
          {badge && (
            <span className="text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-full bg-[var(--accent-violet-soft)] text-[#c4b5fd] border border-[#7551FF]/25">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-surface-muted text-sm mt-1.5 sm:mt-2 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="mobile-page-actions shrink-0">{action}</div>}
    </div>
  );
}

/* ─── Hero banner for hub pages ─── */
export function AcademicHeroBanner({
  title,
  subtitle,
  roleLabel,
  avatar,
}: {
  title: string;
  subtitle: string;
  roleLabel?: string;
  avatar?: string;
}) {
  return (
    <HorizonCard className="relative overflow-hidden mb-4 sm:mb-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(circle at 0% 0%, rgba(117,81,255,0.2) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(240,180,41,0.15) 0%, transparent 45%)',
        }}
      />
      <div className="relative flex items-center gap-3 sm:gap-5 flex-wrap">
        {avatar && (
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[16px] sm:rounded-[18px] bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center text-navy-950 text-xl sm:text-2xl font-bold shadow-lg shadow-gold-500/20 shrink-0">
            {avatar}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-[#A3AED0] mb-0.5 sm:mb-1">{subtitle}</p>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-snug">{title}</h2>
          {roleLabel && (
            <span className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-white/[0.06] text-gold-400 border border-gold-400/20">
              {roleLabel}
            </span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.06]">
          <span className="w-2 h-2 rounded-full bg-[#01B574] animate-pulse" />
          <span className="text-xs font-medium text-[#A3AED0]">وحدة أكاديمية</span>
        </div>
      </div>
    </HorizonCard>
  );
}

/* ─── Action cards ─── */
type Accent = 'gold' | 'blue' | 'purple' | 'green' | 'rose';

const ACCENT_STYLES: Record<Accent, string> = {
  gold: 'from-gold-500 to-gold-600 text-navy-950',
  blue: 'from-[#4481EB] to-[#04BEFE] text-on-contrast',
  purple: 'from-[#7551FF] to-[#422AFB] text-on-contrast',
  green: 'from-[#01B574] to-[#008F5D] text-on-contrast',
  rose: 'from-[#E31A1A] to-[#C0392B] text-on-contrast',
};

export function AcademicActionCard({
  to,
  label,
  description,
  icon: Icon,
  accent = 'gold',
}: {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent?: Accent;
}) {
  return (
    <Link
      to={to}
      className="horizon-card group block rounded-2xl sm:rounded-[20px] bg-[#111c44] p-4 sm:p-5 transition-all duration-300 hover:bg-[#1B254B] hover:shadow-[0_20px_45px_rgba(0,0,0,0.28)] active:scale-[0.99] border border-white/[0.04] min-h-[72px]"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className={clsx(
            'w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br transition-transform duration-300 group-hover:scale-105 shadow-lg',
            ACCENT_STYLES[accent],
          )}
        >
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-white font-bold text-sm sm:text-base group-hover:text-gold-400 transition-colors">{label}</h3>
            <ArrowRight className="w-4 h-4 text-[#A3AED0] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all rotate-180" />
          </div>
          <p className="text-[#A3AED0] text-sm mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}

/* ─── Section title ─── */
export function AcademicSectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        {children}
        {count !== undefined && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-[#A3AED0]">{count}</span>
        )}
      </h2>
    </div>
  );
}

/* ─── Form panel ─── */
export function AcademicFormPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <HorizonCard className={clsx('mb-6 space-y-4', className)}>
      {title && (
        <h2 className="text-lg font-bold text-white pb-3 border-b border-white/[0.06]">{title}</h2>
      )}
      {children}
    </HorizonCard>
  );
}

/* ─── List item card ─── */
export function AcademicItemCard({
  children,
  className,
  onClick,
  to,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  to?: string;
}) {
  const base = clsx(
    'horizon-card rounded-[16px] bg-[#111c44] p-4 border border-white/[0.04] transition-all duration-200',
    (onClick || to) && 'hover:bg-[#1B254B] hover:border-gold-400/20 cursor-pointer',
    className,
  );

  if (to) {
    return (
      <Link to={to} className={clsx(base, 'block')}>
        {children}
      </Link>
    );
  }

  return (
    <div className={base} onClick={onClick} role={onClick ? 'button' : undefined}>
      {children}
    </div>
  );
}

/* ─── Badge ─── */
const BADGE_VARIANTS = {
  default: 'bg-white/10 text-[#A3AED0]',
  success: 'bg-[#01B574]/15 text-[#01B574] border border-[#01B574]/25',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
  danger: 'bg-red-500/15 text-red-300 border border-red-500/25',
  gold: 'bg-gold-500/15 text-gold-400 border border-gold-400/25',
  info: 'bg-[#4481EB]/15 text-[#04BEFE] border border-[#4481EB]/25',
} as const;

export function AcademicBadge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: keyof typeof BADGE_VARIANTS;
}) {
  return (
    <span className={clsx('inline-flex text-xs font-semibold px-2.5 py-1 rounded-full', BADGE_VARIANTS[variant])}>
      {children}
    </span>
  );
}

/* ─── Empty state ─── */
export function AcademicEmpty({ message, icon: Icon = Inbox }: { message: string; icon?: LucideIcon }) {
  return (
    <HorizonCard className="py-14 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-[#A3AED0]" strokeWidth={1.5} />
      </div>
      <p className="text-[#A3AED0] text-sm">{message}</p>
    </HorizonCard>
  );
}

/* ─── Table ─── */
export function AcademicTable({ children }: { children: React.ReactNode }) {
  return (
    <HorizonCard className="overflow-hidden p-0">
      <div className="table-scroll">
        <table className="w-full text-sm text-right min-w-[640px]">{children}</table>
      </div>
    </HorizonCard>
  );
}

/* ─── Responsive data view: table on desktop, cards on mobile ─── */
export type AcademicColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  /** يظهر كعنوان بارز في بطاقة الجوال */
  primary?: boolean;
  /** يخفي عنوان الحقل في بطاقة الجوال */
  hideLabelOnMobile?: boolean;
  className?: string;
};

export function AcademicDataView<T>({
  columns,
  rows,
  keyExtractor,
  onRowClick,
}: {
  columns: AcademicColumn<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
}) {
  const primaryCol = columns.find((c) => c.primary) ?? columns[0];
  const secondaryCols = columns.filter((c) => c !== primaryCol);

  return (
    <>
      {/* بطاقات — الجوال */}
      <div className="grid gap-2.5 sm:hidden">
        {rows.map((row) => (
          <div
            key={keyExtractor(row)}
            className={clsx(
              'rounded-2xl bg-[#111c44] border border-white/[0.06] p-4',
              onRowClick && 'active:bg-[#1B254B] cursor-pointer',
            )}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            <div className="font-bold text-white text-base mb-2">{primaryCol.render(row)}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {secondaryCols.map((col) => (
                <div key={col.key} className="min-w-0">
                  {!col.hideLabelOnMobile && (
                    <p className="text-[10px] text-[#A3AED0] mb-0.5">{col.header}</p>
                  )}
                  <div className={clsx('text-sm text-white/90 truncate', col.className)}>
                    {col.render(row)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* جدول — الحاسب */}
      <div className="hidden sm:block">
        <HorizonCard className="overflow-hidden p-0">
          <div className="table-scroll">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="text-[#A3AED0] border-b border-white/10 bg-white/[0.02]">
                  {columns.map((col) => (
                    <th key={col.key} className="p-3 font-semibold whitespace-nowrap">{col.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={keyExtractor(row)}
                    className={clsx(
                      'border-b border-white/5 text-white',
                      onRowClick && 'hover:bg-white/[0.03] cursor-pointer',
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={clsx('p-3', col.className)}>{col.render(row)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HorizonCard>
      </div>
    </>
  );
}

/* ─── Chip selector ─── */
export function AcademicChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px]',
        selected
          ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-navy-950 shadow-md shadow-gold-500/20'
          : 'bg-white/[0.08] text-white hover:bg-white/[0.12] border border-white/[0.06]',
      )}
    >
      {label}
    </button>
  );
}

/* ─── Icon buttons ─── */
export function AcademicIconButton({
  onClick,
  icon: Icon,
  variant = 'edit',
  label,
}: {
  onClick: () => void;
  icon: LucideIcon;
  variant?: 'edit' | 'delete';
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={clsx(
        'p-2.5 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center',
        variant === 'edit' && 'text-gold-400 hover:bg-gold-400/10',
        variant === 'delete' && 'text-red-400 hover:bg-red-400/10',
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

/* ─── Form field ─── */
export function AcademicField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx('block text-sm text-[#A3AED0]', className)}>
      <span className="block mb-1.5 font-medium">{label}</span>
      {children}
    </label>
  );
}

/* ─── Success panel ─── */
export function AcademicSuccessPanel({ title, message, action }: { title: string; message?: string; action?: React.ReactNode }) {
  return (
    <HorizonCard className="py-12 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-full bg-[#01B574]/15 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">✓</span>
      </div>
      <h2 className="text-xl font-bold text-gold-400 mb-2">{title}</h2>
      {message && <p className="text-[#A3AED0] text-sm mb-4">{message}</p>}
      {action}
    </HorizonCard>
  );
}

/* ─── Setup stepper ─── */
export function AcademicStepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center shrink-0">
          <div
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
              i === current
                ? 'bg-gold-500/20 text-gold-400 border border-gold-400/30'
                : i < current
                  ? 'bg-[#01B574]/15 text-[#01B574]'
                  : 'bg-white/[0.06] text-[#A3AED0]',
            )}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-black/20">{i + 1}</span>
            {s}
          </div>
          {i < steps.length - 1 && <div className="w-4 h-px bg-white/10 mx-1" />}
        </div>
      ))}
    </div>
  );
}

/* ─── Styles ─── */
export const academicInputClass =
  'w-full rounded-xl bg-navy-900/80 border border-white/10 px-3 py-3 sm:py-2.5 text-base sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/40 focus:border-gold-400/30 transition-shadow min-h-[48px] sm:min-h-0';

export const academicBtnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-navy-950 font-bold px-5 py-3 sm:py-2.5 min-h-[48px] sm:min-h-[44px] hover:opacity-90 hover:shadow-lg hover:shadow-gold-500/20 disabled:opacity-50 transition-all w-full sm:w-auto';

export const academicBtnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.08] text-white font-semibold px-5 py-3 sm:py-2.5 min-h-[48px] sm:min-h-[44px] hover:bg-white/[0.12] border border-white/[0.06] transition-colors w-full sm:w-auto';

export const academicBtnDanger =
  'inline-flex items-center justify-center gap-2 rounded-xl text-red-400 font-semibold px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 hover:bg-red-400/10 transition-colors w-full sm:w-auto';

export const academicGrid2 = 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4';
export const academicGrid3 = 'grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3';
