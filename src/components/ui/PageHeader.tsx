import { motion } from 'framer-motion';
import clsx from 'clsx';
import { itemVariants } from '../../lib/motionVariants';
import { ScreenGuideButton } from '../admin/ScreenGuideButton';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
  guidePath?: string;
  icon?: React.ComponentType<{ className?: string }>;
  avatar?: string;
  role?: string;
  className?: string;
  variant?: 'default' | 'hero';
};

export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  guidePath,
  icon: Icon,
  avatar,
  role,
  className,
  variant = 'default',
}: PageHeaderProps) {
  const isHero = variant === 'hero';

  return (
    <motion.div
      variants={itemVariants}
      className={clsx(
        isHero
          ? 'relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-2xl p-4 sm:p-7 md:p-8 overflow-hidden bg-[var(--primary)] border border-[var(--border)] shadow-[0_12px_32px_rgba(15,39,68,0.2)]'
          : 'page-header',
        className
      )}
    >
      {isHero && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 70% 80% at 100% 0%, rgba(201,154,46,0.35), transparent 55%)',
          }}
        />
      )}
      <div className="relative flex items-center gap-4 md:gap-5 flex-1 min-w-0">
        {avatar ? (
          <div
            className={clsx(
              'rounded-2xl bg-[var(--accent)] flex items-center justify-center font-bold shrink-0 border border-[var(--border)] text-on-contrast',
              isHero ? 'w-16 h-16 md:w-[4.5rem] md:h-[4.5rem] text-3xl' : 'w-14 h-14 text-2xl'
            )}
          >
            {avatar}
          </div>
        ) : Icon ? (
          <div
            className={clsx(
              'rounded-xl bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] flex items-center justify-center shrink-0',
              isHero ? 'w-14 h-14' : 'w-12 h-12'
            )}
          >
            <Icon className={clsx('text-[var(--accent)]', isHero ? 'w-7 h-7' : 'w-6 h-6')} />
          </div>
        ) : null}
        <div className="min-w-0">
          {subtitle && (
            <p
              className={clsx(
                'font-medium mb-1',
                isHero
                  ? 'text-sm md:text-base text-on-contrast opacity-80'
                  : 'text-sm text-[var(--text-secondary)]'
              )}
            >
              {subtitle}
            </p>
          )}
          <h1
            className={clsx(
              'font-bold truncate tracking-tight',
              isHero
                ? 'text-2xl sm:text-3xl md:text-4xl text-on-contrast'
                : 'text-xl md:text-2xl text-[var(--text-primary)]'
            )}
          >
            {title}
          </h1>
          {role && (
            <p
              className={clsx(
                'font-semibold mt-1 text-[var(--accent)]',
                isHero ? 'text-sm md:text-base' : 'text-sm'
              )}
            >
              {role}
            </p>
          )}
        </div>
      </div>
      {badge && (
        <span className="relative text-xs px-3 py-1.5 rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] font-mono shrink-0">
          {badge}
        </span>
      )}
      {actions || guidePath ? (
        <div className="relative w-full md:w-auto shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap justify-end">
          {guidePath && <ScreenGuideButton path={guidePath} />}
          {actions}
        </div>
      ) : null}
    </motion.div>
  );
}
