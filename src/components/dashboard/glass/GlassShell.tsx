import type { ReactNode } from 'react';
import clsx from 'clsx';
import './glass.css';

type GlassShellProps = {
  children: ReactNode;
  className?: string;
};

export function GlassShell({ children, className }: GlassShellProps) {
  return (
    <div className={clsx('glass-dash', className)} dir="rtl">
      <div className="glass-dash__bg" aria-hidden />
      {children}
    </div>
  );
}

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
};

const PAD = { none: '', sm: 'p-3.5 sm:p-4', md: 'p-4 sm:p-5', lg: 'p-5 sm:p-6' };

export function GlassCard({ children, className, glow, padding = 'md' }: GlassCardProps) {
  return (
    <div className={clsx('glass-card', glow && 'glass-card--glow-purple', PAD[padding], className)}>
      {children}
    </div>
  );
}
