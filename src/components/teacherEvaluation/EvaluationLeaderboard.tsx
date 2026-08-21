import { Trophy, Medal, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import type { TeacherEvalResult } from '../../lib/teacherEvaluation/types';

type Props = {
  results: TeacherEvalResult[];
  onSelect?: (teacherId: string) => void;
  selectedId?: string;
};

export function EvaluationLeaderboard({ results, onSelect, selectedId }: Props) {
  if (!results.length) {
    return <p className="text-[#A3AED0] text-sm">لا توجد نتائج بعد.</p>;
  }

  const top = results[0];

  return (
    <div className="space-y-4">
      {top && (
        <div className="rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-600/5 border border-gold-400/30 p-5 text-center">
          <Trophy className="w-10 h-10 text-gold-400 mx-auto mb-2" />
          <p className="text-gold-300 text-xs font-semibold uppercase tracking-wide">معلم الشهر</p>
          <h3 className="text-white text-xl font-bold mt-1">{top.teacherName}</h3>
          <p className="text-gold-200 text-lg font-bold mt-1">{top.finalScore.toFixed(1)} / 100</p>
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-4 py-3 bg-white/[0.04] border-b border-white/[0.06] flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#01B574]" />
          <span className="text-white font-semibold text-sm">لوحة المتصدرين</span>
        </div>
        <ul className="divide-y divide-white/[0.04]">
          {results.map((r) => (
            <li key={r.teacherId}>
              <button
                type="button"
                onClick={() => onSelect?.(r.teacherId)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 text-right transition-colors',
                  onSelect && 'hover:bg-white/[0.04]',
                  selectedId === r.teacherId && 'bg-[#7551FF]/10',
                )}
              >
                <span
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                    r.rank === 1 && 'bg-gold-500 text-navy-950',
                    r.rank === 2 && 'bg-slate-300 text-navy-950',
                    r.rank === 3 && 'bg-amber-700 text-white',
                    r.rank > 3 && 'bg-white/10 text-[#A3AED0]',
                  )}
                >
                  {r.rank <= 3 ? <Medal className="w-4 h-4" /> : r.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{r.teacherName}</p>
                  <p className="text-[#A3AED0] text-xs">
                    مرجّح: {r.weightedScore.toFixed(1)}
                    {r.totalDeductions > 0 && (
                      <span className="text-rose-400 mr-1"> −{r.totalDeductions} خصم</span>
                    )}
                  </p>
                </div>
                <span className="text-white font-bold text-lg shrink-0">{r.finalScore.toFixed(1)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
