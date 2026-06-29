import { useMemo } from 'react';
import { MessageCircle, Sparkles, BookOpen, CalendarCheck, Award, Heart } from 'lucide-react';
import clsx from 'clsx';
import { buildParentCommunicationSuggestions } from '../../lib/parentCommunicationSuggestions';
import type { AxisBreakdown } from '../../lib/calculations';
import type { PointLedgerRow } from '../../lib/parentProgressComparison';

type Props = {
  breakdown: AxisBreakdown;
  points: PointLedgerRow[];
  classAverage: number | null;
  totalPoints: number;
  attendanceRecords: Array<{ status: string }>;
  examScorePct: number | null;
  hasApprovedSuggestion?: boolean;
};

const ICONS = {
  behavior: Heart,
  initiative: Sparkles,
  exam: BookOpen,
  attendance: CalendarCheck,
  activity: Award,
  general: MessageCircle,
};

export function ParentCommunicationSuggestions({
  breakdown,
  points,
  classAverage,
  totalPoints,
  attendanceRecords,
  examScorePct,
  hasApprovedSuggestion = false,
}: Props) {
  const suggestions = useMemo(
    () =>
      buildParentCommunicationSuggestions({
        breakdown,
        points,
        classAverage,
        totalPoints,
        attendanceRecords,
        examScorePct,
        hasApprovedSuggestion,
      }),
    [
      breakdown,
      points,
      classAverage,
      totalPoints,
      attendanceRecords,
      examScorePct,
      hasApprovedSuggestion,
    ],
  );

  if (suggestions.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-4 border border-purple-500/15" dir="rtl">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-purple-400" />
        <div>
          <h3 className="text-white font-semibold text-sm">اقتراحات تواصل ذكية</h3>
          <p className="text-white/40 text-[10px]">توجيه عملي بناءً على أداء ابنك — PA5</p>
        </div>
      </div>

      <div className="space-y-3">
        {suggestions.map((s) => {
          const Icon = ICONS[s.icon];
          return (
            <div
              key={s.id}
              className="p-4 rounded-xl bg-white/3 border border-white/5 space-y-2"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-purple-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm">{s.title}</p>
                  <p className="text-white/60 text-xs mt-1 leading-relaxed">{s.message}</p>
                  {s.actionHint && (
                    <p
                      className={clsx(
                        'text-purple-200/70 text-xs mt-2 p-2 rounded-lg',
                        'bg-purple-500/10 border border-purple-500/15',
                      )}
                    >
                      💡 {s.actionHint}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
