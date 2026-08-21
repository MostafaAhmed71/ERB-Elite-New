import clsx from 'clsx';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

type HorizonCardProps = {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md';
};

/** بطاقة بأسلوب Horizon: navy.800، زوايا 20px، بدون حدود صلبة */
export function HorizonCard({ children, className, padding = 'md' }: HorizonCardProps) {
  return (
    <div
      className={clsx(
        'horizon-card rounded-2xl sm:rounded-[20px]',
        padding === 'md' ? 'p-4 sm:p-5' : 'p-3 sm:p-4',
        className
      )}
    >
      {children}
    </div>
  );
}

type HorizonIconBoxProps = {
  icon: LucideIcon;
  variant?: 'soft' | 'gradient' | 'blue';
  className?: string;
};

const ICON_VARIANTS = {
  soft: 'bg-white/[0.08] text-[#f0b429]',
  gradient: 'bg-gradient-to-br from-[#f0b429] to-[#d4a017] text-[#111c44]',
  blue: 'bg-gradient-to-r from-[#4481EB] to-[#04BEFE] text-white',
};

export function HorizonIconBox({ icon: Icon, variant = 'soft', className }: HorizonIconBoxProps) {
  return (
    <div
      className={clsx(
        'w-14 h-14 rounded-full flex items-center justify-center shrink-0',
        ICON_VARIANTS[variant],
        className
      )}
    >
      <Icon className="w-7 h-7" strokeWidth={2} />
    </div>
  );
}

type HorizonStatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconVariant?: 'soft' | 'gradient' | 'blue';
  index?: number;
};

export function HorizonStatCard({
  label,
  value,
  icon,
  iconVariant,
  index = 0,
}: HorizonStatCardProps) {
  const resolvedVariant = iconVariant ?? (index === 0 ? 'gradient' : index === 2 ? 'blue' : 'soft');

  return (
    <HorizonCard padding="sm" className="py-3 sm:py-[15px]">
      <div className="flex items-center gap-3 sm:gap-[18px] h-full">
        <HorizonIconBox icon={icon} variant={resolvedVariant} className="!w-11 !h-11 sm:!w-14 sm:!h-14 [&_svg]:!w-5 [&_svg]:!h-5 sm:[&_svg]:!w-7 sm:[&_svg]:!h-7" />
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-surface-muted leading-none mb-1 sm:mb-2 line-clamp-2">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-white tracking-tight tabular-nums">{value}</p>
        </div>
      </div>
    </HorizonCard>
  );
}

type HorizonWelcomeCardProps = {
  title: string;
  subtitle: string;
  role?: string;
  avatar: string;
};

export function HorizonWelcomeCard({ title, subtitle, role, avatar }: HorizonWelcomeCardProps) {
  return (
    <HorizonCard className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 0% 0%, rgba(117,81,255,0.18) 0%, transparent 45%), radial-gradient(circle at 100% 100%, rgba(240,180,41,0.12) 0%, transparent 40%)',
        }}
      />
      <div className="relative flex items-center gap-3 sm:gap-5 flex-wrap">
        <div className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-2xl sm:rounded-[20px] bg-gradient-to-br from-[#f0b429] to-[#d4a017] flex items-center justify-center text-[#111c44] text-2xl sm:text-3xl font-bold shadow-lg shadow-[#f0b429]/20 shrink-0">
          {avatar}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-surface-muted mb-0.5 sm:mb-1">{subtitle}</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug">{title}</h1>
          {role && (
            <span className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-[var(--accent-violet-soft)] text-[#c4b5fd] border border-[#7551FF]/25">
              {role}
            </span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.06]">
          <span className="w-2 h-2 rounded-full bg-[#01B574] animate-pulse" />
          <span className="text-xs font-medium text-surface-muted">النظام متصل</span>
        </div>
      </div>
    </HorizonCard>
  );
}

type HorizonActionCardProps = {
  to: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  accent?: 'gold' | 'blue' | 'purple';
};

const ACTION_ACCENTS = {
  gold: 'from-[#f0b429] to-[#d4a017] text-[#111c44]',
  blue: 'from-[#4481EB] to-[#04BEFE] text-white',
  purple: 'from-[#7551FF] to-[#422AFB] text-white',
};

export function HorizonActionCard({
  to,
  label,
  description,
  icon: Icon,
  accent = 'gold',
}: HorizonActionCardProps) {
  return (
    <Link
      to={to}
      className="horizon-card group block rounded-2xl sm:rounded-[20px] p-4 sm:p-5 transition-all duration-300 hover:bg-[#1B254B] hover:shadow-[0_20px_45px_rgba(0,0,0,0.28)] active:scale-[0.99] h-full min-h-[120px]"
    >
      <div
        className={clsx(
          'w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-3 sm:mb-4 bg-gradient-to-br transition-transform duration-300 group-hover:scale-105',
          ACTION_ACCENTS[accent]
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm sm:text-base font-bold text-white mb-1 group-hover:text-[#f0b429] transition-colors leading-snug">
        {label}
      </h3>
      {description && <p className="text-xs font-medium text-surface-muted leading-relaxed line-clamp-2">{description}</p>}
    </Link>
  );
}
