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
        'horizon-card rounded-[20px] bg-[#111c44] shadow-[0_18px_40px_rgba(0,0,0,0.22)]',
        padding === 'md' ? 'p-5' : 'p-4',
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
    <HorizonCard padding="sm" className="py-[15px]">
      <div className="flex items-center gap-[18px] h-full">
        <HorizonIconBox icon={icon} variant={resolvedVariant} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#A3AED0] leading-none mb-2">{label}</p>
          <p className="text-2xl font-bold text-white tracking-tight tabular-nums">{value}</p>
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
      <div className="relative flex items-center gap-5 flex-wrap">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-gradient-to-br from-[#f0b429] to-[#d4a017] flex items-center justify-center text-[#111c44] text-3xl font-bold shadow-lg shadow-[#f0b429]/20">
          {avatar}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#A3AED0] mb-1">{subtitle}</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight truncate">{title}</h1>
          {role && (
            <span className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-[#422AFB]/20 text-[#c4b5fd] border border-[#7551FF]/25">
              {role}
            </span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.06]">
          <span className="w-2 h-2 rounded-full bg-[#01B574] animate-pulse" />
          <span className="text-xs font-medium text-[#A3AED0]">النظام متصل</span>
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
      className="horizon-card group block rounded-[20px] bg-[#111c44] p-5 transition-all duration-300 hover:bg-[#1B254B] hover:shadow-[0_20px_45px_rgba(0,0,0,0.28)] hover:-translate-y-0.5"
    >
      <div
        className={clsx(
          'w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-gradient-to-br transition-transform duration-300 group-hover:scale-105',
          ACTION_ACCENTS[accent]
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-base font-bold text-white mb-1 group-hover:text-[#f0b429] transition-colors">
        {label}
      </h3>
      {description && <p className="text-xs font-medium text-[#A3AED0] leading-relaxed">{description}</p>}
    </Link>
  );
}
