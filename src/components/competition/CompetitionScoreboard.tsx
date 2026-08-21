import clsx from 'clsx';
import { Medal, Trophy } from 'lucide-react';
import type { CompLeaderboardRow } from '../../lib/competition/types';

type Props = {
  rows: CompLeaderboardRow[];
  highlightSlug?: string;
  compact?: boolean;
  className?: string;
};

function medalFor(rank: number) {
  if (rank === 1) return { icon: Trophy, color: 'text-yellow-400' };
  if (rank === 2) return { icon: Medal, color: 'text-slate-300' };
  if (rank === 3) return { icon: Medal, color: 'text-amber-600' };
  return null;
}

export function CompetitionScoreboard({ rows, highlightSlug, compact, className }: Props) {
  return (
    <div className={clsx('w-full max-w-3xl mx-auto space-y-2', className)} dir="rtl">
      {rows.map((row) => {
        const medal = medalFor(row.rank);
        const Icon = medal?.icon;
        const highlight = highlightSlug && row.url_slug === highlightSlug;
        return (
          <div
            key={row.class_id}
            className={clsx(
              'flex items-center gap-3 rounded-xl border px-4',
              compact ? 'py-2' : 'py-3',
              highlight
                ? 'bg-gold-400/20 border-gold-400/50 ring-1 ring-gold-400/40'
                : 'bg-white/5 border-white/10',
              row.rank <= 3 && 'shadow-lg shadow-black/20',
            )}
          >
            <div
              className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0',
                row.rank === 1 && 'bg-yellow-400/20 text-yellow-300',
                row.rank === 2 && 'bg-slate-400/20 text-slate-200',
                row.rank === 3 && 'bg-amber-700/20 text-amber-400',
                row.rank > 3 && 'bg-white/10 text-white/70',
              )}
            >
              {Icon ? <Icon className={clsx('w-5 h-5', medal?.color)} /> : row.rank}
            </div>
            <div className="flex-1 min-w-0">
              <p className={clsx('font-bold truncate', compact ? 'text-base' : 'text-lg md:text-xl')}>
                {row.name}
              </p>
            </div>
            <p className={clsx('font-black text-gold-300 tabular-nums', compact ? 'text-lg' : 'text-2xl')}>
              {row.total_points}
            </p>
          </div>
        );
      })}
      {rows.length === 0 && (
        <p className="text-center text-white/50 py-8">لا توجد نتائج بعد</p>
      )}
    </div>
  );
}
