import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';
import { HumaaansIllustration } from './HumaaansIllustration';
import type { IllustrationId } from '../../lib/illustrations';

type EmptyStateAction = {
  label: string;
  to?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
};

type EmptyStateProps = {
  icon?: LucideIcon;
  illustration?: IllustrationId;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
};

export function EmptyState({
  icon: Icon = Inbox,
  illustration,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'glass-card p-12 text-center flex flex-col items-center',
        className
      )}
    >
      {illustration ? (
        <HumaaansIllustration
          id={illustration}
          className="w-40 h-40 mb-2 opacity-90"
        />
      ) : (
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-white/30" />
        </div>
      )}
      <h3 className="text-white font-semibold text-base">{title}</h3>
      {description && (
        <p className="text-white/40 text-sm mt-1.5 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          {action.to ? (
            <Link to={action.to}>
              <Button variant={action.variant ?? 'primary'} size="md">
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button
              variant={action.variant ?? 'primary'}
              size="md"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
