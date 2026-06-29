import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { itemVariants, cardHover } from '../../lib/motionVariants';

type PanelProps = {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  animate?: boolean;
};

export function Panel({ children, className, hover = false, animate = true }: PanelProps) {
  const Comp = animate ? motion.div : 'div';
  const props = animate
    ? { variants: itemVariants, className: clsx('glass-card', hover && 'glass-card-hover', className) }
    : { className: clsx('glass-card', hover && 'glass-card-hover', className) };

  return <Comp {...props}>{children}</Comp>;
}

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  index?: number;
  variant?: 'default' | 'premium';
  iconGlow?: string;
  valueClass?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  index = 0,
  variant = 'default',
  iconGlow,
  valueClass,
}: StatCardProps) {
  const isPremium = variant === 'premium';

  return (
    <motion.div
      variants={itemVariants}
      whileHover={cardHover}
      custom={index}
      className={clsx(
        'relative overflow-hidden rounded-2xl border p-5 md:p-6 cursor-default transition-all duration-300',
        isPremium
          ? 'bg-white/5 backdrop-blur-lg border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
          : clsx('backdrop-blur-sm stat-card-shine', bg)
      )}
    >
      <div className="flex items-start justify-between relative z-10 gap-3">
        <div className="min-w-0">
          <p
            className={clsx(
              'font-medium tracking-wide mb-2',
              isPremium ? 'text-white/55 text-sm' : 'text-white/50 text-xs mb-1.5'
            )}
          >
            {label}
          </p>
          <p
            className={clsx(
              'font-bold tabular-nums tracking-tight',
              isPremium ? 'text-4xl md:text-5xl' : 'text-2xl text-white',
              isPremium ? valueClass : 'text-white'
            )}
          >
            {value}
          </p>
        </div>
        <div
          className={clsx(
            'rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0',
            isPremium ? 'w-12 h-12 md:w-14 md:h-14' : 'w-11 h-11 shadow-lg icon-glow',
            color,
            isPremium && iconGlow
          )}
        >
          <Icon className={clsx('text-white', isPremium ? 'w-6 h-6 md:w-7 md:h-7' : 'w-5 h-5')} />
        </div>
      </div>
      {!isPremium && (
        <>
          <div className={clsx('absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-l opacity-80', color)} />
          <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-white/[0.02] blur-2xl pointer-events-none" />
        </>
      )}
      {isPremium && (
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white/[0.03] blur-2xl pointer-events-none" />
      )}
    </motion.div>
  );
}

type ActionCardProps = {
  to: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
};

export function ActionCard({ to, label, description, icon: Icon, iconColor = 'text-gold-400' }: ActionCardProps) {
  return (
    <motion.div variants={itemVariants} whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.98 }}>
      <Link to={to} className="action-card group block h-full">
        <div className="flex justify-between items-start">
          <div className={clsx('p-3 bg-white/5 rounded-xl transition-colors group-hover:bg-white/8', iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-white/20 group-hover:text-white/50 transition-all group-hover:-translate-x-1 text-lg">
            ←
          </span>
        </div>
        <div className="mt-3">
          <h3 className="text-white font-semibold text-sm group-hover:text-gold-400 transition-colors">{label}</h3>
          {description && (
            <p className="text-white/40 text-xs mt-1 leading-relaxed line-clamp-2">{description}</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

type QuickLinkProps = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'premium';
  description?: string;
};

export function QuickLink({ to, label, icon: Icon, variant = 'default', description }: QuickLinkProps) {
  const isPremium = variant === 'premium';

  if (isPremium) {
    return (
      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
        <Link
          to={to}
          className="group flex items-center gap-4 p-4 md:p-5 rounded-xl bg-slate-800/50 border border-white/5 hover:bg-slate-700 hover:border-white/10 transition-all duration-300 h-full"
        >
          <div className="p-2.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
            <Icon className="w-5 h-5 text-gold-400 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-sm md:text-base font-bold text-white group-hover:text-gold-300 transition-colors">
              {label}
            </span>
            {description && (
              <span className="block text-xs text-white/45 font-medium mt-0.5">{description}</span>
            )}
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div whileHover={{ scale: 1.03, y: -3 }} whileTap={{ scale: 0.97 }}>
      <Link to={to} className="quick-link group">
        <Icon className="w-5 h-5 text-gold-400/70 group-hover:text-gold-400 transition-colors shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </Link>
    </motion.div>
  );
}

type SectionTitleProps = {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
};

export function SectionTitle({ children, icon: Icon, className }: SectionTitleProps) {
  return (
    <h2 className={clsx('section-title', className)}>
      {Icon && <Icon className="w-5 h-5 text-gold-400" />}
      {children}
    </h2>
  );
}
