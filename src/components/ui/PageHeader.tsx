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
          ? 'relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-2xl p-4 sm:p-7 md:p-8 overflow-hidden bg-gradient-to-r from-slate-900 to-indigo-900 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]'
          : 'page-header',
        className
      )}
    >
      <div
        className={clsx(
          'absolute inset-0 pointer-events-none rounded-2xl',
          isHero
            ? 'bg-gradient-to-l from-indigo-500/10 via-transparent to-gold-500/5'
            : 'bg-gradient-to-l from-gold-500/[0.03] to-transparent'
        )}
      />
      <div className="relative flex items-center gap-4 md:gap-5 flex-1 min-w-0">
        {avatar ? (
          <div
            className={clsx(
              'rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-950 font-bold shadow-lg shadow-gold-500/25 shrink-0 avatar-ring',
              isHero ? 'w-16 h-16 md:w-[4.5rem] md:h-[4.5rem] text-3xl' : 'w-14 h-14 text-2xl'
            )}
          >
            {avatar}
          </div>
        ) : Icon ? (
          <div
            className={clsx(
              'rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0',
              isHero ? 'w-14 h-14' : 'w-12 h-12'
            )}
          >
            <Icon className={clsx('text-gold-400', isHero ? 'w-7 h-7' : 'w-6 h-6')} />
          </div>
        ) : null}
        <div className="min-w-0">
          {subtitle && (
            <p className={clsx('text-white/50 font-medium mb-1', isHero ? 'text-sm md:text-base' : 'text-sm')}>
              {subtitle}
            </p>
          )}
          <h1
            className={clsx(
              'font-bold text-white truncate',
              isHero ? 'text-2xl sm:text-3xl md:text-4xl tracking-tight' : 'text-xl md:text-2xl'
            )}
          >
            {title}
          </h1>
          {role && (
            <p className={clsx('text-gold-400 font-semibold mt-1', isHero ? 'text-sm md:text-base' : 'text-sm')}>
              {role}
            </p>
          )}
        </div>
      </div>
      {badge && (
        <span className="relative text-xs px-3 py-1.5 rounded-full border border-gold-500/20 bg-gold-500/5 text-gold-400 font-mono shrink-0">
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
