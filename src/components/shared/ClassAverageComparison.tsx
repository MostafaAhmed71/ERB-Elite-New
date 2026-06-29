import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

type Props = {
  studentScore: number;
  classAverage: number | null;
};

export function ClassAverageComparison({ studentScore, classAverage }: Props) {
  if (classAverage == null) return null;

  const diff = studentScore - classAverage;
  const above = diff > 0;
  const equal = diff === 0;

  return (
    <div className="glass-card p-4 flex items-center justify-between gap-3" dir="rtl">
      <div>
        <p className="text-white/50 text-xs">مقارنة بلطف مع متوسط الفصل</p>
        <p className="text-white/70 text-[11px] mt-0.5">بدون أسماء طلاب — للمتابعة فقط</p>
      </div>
      <div className="text-left">
        <p className="text-white/40 text-[10px]">متوسط الفصل: <span className="text-white/60 font-mono">{classAverage}</span></p>
        <p className={clsx('text-sm font-bold flex items-center gap-1 justify-end mt-1', above ? 'text-emerald-400' : equal ? 'text-white/50' : 'text-amber-400')}>
          {above ? <TrendingUp className="w-4 h-4" /> : equal ? <Minus className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {equal ? 'عند المتوسط' : above ? `أعلى بـ ${diff} نقطة` : `أقل بـ ${Math.abs(diff)} نقطة`}
        </p>
      </div>
    </div>
  );
}
