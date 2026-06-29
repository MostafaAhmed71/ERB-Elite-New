import { Trophy, Medal } from 'lucide-react';
import type { ClassRankEntry } from '../../hooks/useStudentMetrics';
import clsx from 'clsx';

type Props = {
  rank: number | null;
  top3: ClassRankEntry[];
  currentStudentId?: string;
};

const MEDAL_COLORS = ['text-yellow-400', 'text-zinc-300', 'text-amber-600'];

export function ClassRankSection({ rank, top3, currentStudentId }: Props) {
  if (rank == null && top3.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-4" dir="rtl">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <Trophy className="w-4 h-4 text-gold-400" />
        ترتيبك في الفصل
        {rank != null && (
          <span className="mr-auto text-gold-400 font-bold">#{rank}</span>
        )}
      </h3>

      {top3.length > 0 && (
        <div className="space-y-2">
          <p className="text-white/40 text-[10px]">أوائل الفصل هذا الأسبوع</p>
          {top3.map((entry, i) => (
            <div
              key={entry.studentId}
              className={clsx(
                'flex items-center justify-between gap-2 p-2 rounded-xl text-xs',
                entry.studentId === currentStudentId ? 'bg-gold-500/10 border border-gold-500/20' : 'bg-white/3 border border-white/5'
              )}
            >
              <div className="flex items-center gap-2">
                <Medal className={clsx('w-4 h-4', MEDAL_COLORS[i] ?? 'text-white/30')} />
                <span className="text-white font-medium">{entry.name}</span>
                {entry.studentId === currentStudentId && (
                  <span className="text-gold-400 text-[10px]">(أنت)</span>
                )}
              </div>
              <span className="text-white/50 font-mono tabular-nums">{entry.score} ن</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
