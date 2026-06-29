import { Crown, Medal, School } from 'lucide-react';
import clsx from 'clsx';

const PODIUM = {
  1: { ring: 'ring-gold-400/50', bg: 'from-gold-400/30 to-amber-600/10', text: 'text-gold-300', label: 'ذهبي' },
  2: { ring: 'ring-slate-300/40', bg: 'from-slate-400/25 to-slate-600/10', text: 'text-slate-200', label: 'فضي' },
  3: { ring: 'ring-amber-700/40', bg: 'from-amber-600/25 to-amber-900/10', text: 'text-amber-400', label: 'برونزي' },
} as const;

export function RankBadge({ rank, size = 'md' }: { rank: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' };
  const iconSize = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  if (rank === 1) {
    return (
      <div className={clsx('rounded-xl bg-gold-400/15 border border-gold-400/30 flex items-center justify-center', sizes[size])}>
        <Crown className={clsx(iconSize, 'text-gold-400')} />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className={clsx('rounded-xl bg-slate-400/10 border border-slate-400/25 flex items-center justify-center', sizes[size])}>
        <Medal className={clsx(iconSize, 'text-slate-300')} />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className={clsx('rounded-xl bg-amber-700/15 border border-amber-700/30 flex items-center justify-center', sizes[size])}>
        <Medal className={clsx(iconSize, 'text-amber-500')} />
      </div>
    );
  }
  return (
    <div className={clsx('rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white/40 tabular-nums', sizes[size])}>
      {rank}
    </div>
  );
}

export function getPodiumStyle(rank: 1 | 2 | 3) {
  return PODIUM[rank];
}

export function StudentAvatar({
  name,
  photoUrl,
  rank,
  large,
}: {
  name: string;
  photoUrl?: string | null;
  rank?: number;
  large?: boolean;
}) {
  const isTop = rank !== undefined && rank <= 3;
  const style = rank === 1 ? PODIUM[1] : rank === 2 ? PODIUM[2] : rank === 3 ? PODIUM[3] : null;

  return (
    <div
      className={clsx(
        'rounded-2xl bg-gradient-to-br border flex items-center justify-center font-black text-white shrink-0 overflow-hidden',
        large ? 'w-16 h-16 text-2xl ring-2' : 'w-9 h-9 text-sm',
        isTop && style ? `${style.bg} ${style.ring}` : 'from-[#1B3B86] to-indigo-700 border-white/10'
      )}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        name.charAt(0)
      )}
    </div>
  );
}

export function ClassAvatar({
  grade,
  className,
  photoUrl,
  rank,
  large,
}: {
  grade: string;
  className: string;
  photoUrl?: string | null;
  rank?: number;
  large?: boolean;
}) {
  const isTop = rank !== undefined && rank <= 3;
  const style = rank === 1 ? PODIUM[1] : rank === 2 ? PODIUM[2] : rank === 3 ? PODIUM[3] : null;

  return (
    <div
      className={clsx(
        'rounded-2xl bg-gradient-to-br border flex items-center justify-center shrink-0 overflow-hidden',
        large ? 'w-16 h-16 ring-2' : 'w-9 h-9',
        isTop && style ? `${style.bg} ${style.ring}` : 'from-indigo-800 to-navy-900 border-white/10'
      )}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={`فصل ${className}`} className="w-full h-full object-cover" />
      ) : (
        <School className={clsx(large ? 'w-8 h-8' : 'w-4 h-4', isTop && style ? style.text : 'text-white/50')} />
      )}
    </div>
  );
}
