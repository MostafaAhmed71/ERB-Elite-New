import clsx from 'clsx';
import { formatCountdown } from '../../lib/competition/time';

type Props = {
  remainingMs: number;
  size?: 'lg' | 'xl';
  className?: string;
};

export function CompetitionTimer({ remainingMs, size = 'xl', className }: Props) {
  const urgent = remainingMs <= 10_000;
  return (
    <div
      className={clsx(
        'font-black tabular-nums tracking-wider rounded-2xl border px-6 py-3',
        size === 'xl' ? 'text-5xl md:text-7xl' : 'text-3xl md:text-4xl',
        urgent
          ? 'bg-red-500/20 border-red-400/50 text-red-300 animate-pulse'
          : 'bg-white/10 border-white/20 text-gold-300',
        className,
      )}
    >
      {formatCountdown(remainingMs)}
    </div>
  );
}
