import { useQuery } from '@tanstack/react-query';
import { GitCompare, X } from 'lucide-react';
import clsx from 'clsx';
import type { DbQuestion } from '../../types';
import { fetchQuestionVersionStats } from '../../lib/questionVersionStats';
import { TapHandLoader } from '../ui/TapHandLoader';

type Props = {
  question: DbQuestion;
  onClose: () => void;
};

/** S8 — مقارنة إصدارات السؤال */
export function QuestionVersionComparePanel({ question, onClose }: Props) {
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['question-versions', question.id],
    queryFn: () => fetchQuestionVersionStats(question),
  });

  const best =
    stats.length > 1
      ? [...stats].filter((s) => s.totalAttempts >= 3).sort((a, b) => b.pValue - a.pValue)[0]
      : null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
      <div className="glass-card max-w-lg w-full p-5 space-y-4 border border-cyan-500/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-white font-bold text-sm">مقارنة الإصدارات — S8</h3>
              <p className="text-white/40 text-[10px] line-clamp-2">{question.question_text}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <TapHandLoader label="جاري التحليل..." />
        ) : stats.length <= 1 ? (
          <p className="text-white/40 text-sm text-center py-4">إصدار واحد فقط — أنشئ v2 للمقارنة</p>
        ) : (
          <div className="space-y-2">
            {stats.map((s) => (
              <div
                key={s.questionId}
                className={clsx(
                  'p-3 rounded-xl border text-xs',
                  s.isCurrent ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/5 bg-white/3',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white font-bold">v{s.versionNumber}</span>
                  <span className="font-mono text-gold-400">{s.pValue}% p-value</span>
                </div>
                <p className="text-white/40 mt-1">{s.totalAttempts} محاولة</p>
                {s.suggestion && (
                  <p className="text-amber-400/80 mt-1 text-[10px]">{s.suggestion}</p>
                )}
              </div>
            ))}
            {best && (
              <p className="text-emerald-400 text-xs p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                أفضل صياغة: v{best.versionNumber} (p-value {best.pValue}%)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
