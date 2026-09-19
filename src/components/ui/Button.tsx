import { forwardRef } from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--primary)] text-on-contrast hover:bg-[var(--primary-secondary)] border border-transparent shadow-[0_6px_18px_rgba(15,39,68,0.18)] dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400 dark:shadow-none',
  secondary:
    'bg-transparent hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
  ghost:
    'bg-transparent hover:bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent',
  danger: 'bg-[color-mix(in_srgb,var(--error)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--error)_20%,transparent)] border border-[color-mix(in_srgb,var(--error)_30%,transparent)] text-[var(--error)]',
};
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-semibold transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
});
