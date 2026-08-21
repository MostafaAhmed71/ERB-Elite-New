import { useEffect, useMemo, useState } from 'react';
import type { EvalSource, TeacherEvalAxis, TeacherEvalCriterion } from '../../lib/teacherEvaluation/types';
import type { CriterionScoreInput } from '../../lib/teacherEvaluation/types';
import { scoreFromInput } from '../../lib/teacherEvaluation/scoring';
import { StarScoreInput } from './StarScoreInput';
import { academicInputClass, academicBtnPrimary } from '../academic/AcademicUi';

type Props = {
  axes: TeacherEvalAxis[];
  criteria: TeacherEvalCriterion[];
  source: EvalSource;
  initialScores?: CriterionScoreInput[];
  initialNotes?: string;
  readOnly?: boolean;
  saving?: boolean;
  onSave: (scores: CriterionScoreInput[], notes: string) => void | Promise<void>;
};

export function TeacherEvaluationForm({
  axes,
  criteria,
  source,
  initialScores = [],
  initialNotes = '',
  readOnly,
  saving,
  onSave,
}: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [scores, setScores] = useState<Record<string, CriterionScoreInput>>({});

  const applicable = useMemo(
    () =>
      criteria
        .filter((c) => c.is_active && c.allowed_sources.includes(source))
        .sort((a, b) => a.sort_order - b.sort_order),
    [criteria, source],
  );

  useEffect(() => {
    const map: Record<string, CriterionScoreInput> = {};
    for (const c of applicable) {
      const existing = initialScores.find((s) => s.criterion_id === c.id);
      map[c.id] = existing ?? { criterion_id: c.id, stars: null, score: null, notes: '' };
    }
    setScores(map);
    setNotes(initialNotes);
  }, [applicable, initialScores, initialNotes]);

  const grouped = useMemo(() => {
    const activeAxes = axes.filter((a) => a.is_active).sort((a, b) => a.sort_order - b.sort_order);
    return activeAxes
      .map((axis) => ({
        axis,
        items: applicable.filter((c) => c.axis_id === axis.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [axes, applicable]);

  const totalScore = useMemo(() => {
    return applicable.reduce((sum, c) => {
      const input = scores[c.id];
      if (!input) return sum;
      return sum + scoreFromInput(c, input.stars, input.score);
    }, 0);
  }, [applicable, scores]);

  const maxTotal = applicable.reduce((s, c) => s + Number(c.max_points), 0);

  const patch = (criterionId: string, patch: Partial<CriterionScoreInput>) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], ...patch, criterion_id: criterionId },
    }));
  };

  const handleSave = () => onSave(Object.values(scores), notes);

  if (!applicable.length) {
    return <p className="text-[#A3AED0] text-sm">لا بنود متاحة لهذا المصدر.</p>;
  }

  return (
    <div className="space-y-5">
      {grouped.map(({ axis, items }) => (
        <div key={axis.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-2.5 bg-white/[0.04] border-b border-white/[0.06]">
            <h4 className="text-white font-semibold text-sm">{axis.title}</h4>
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {items.map((c) => {
              const input = scores[c.id];
              const computed = input
                ? scoreFromInput(c, input.stars, input.score)
                : 0;
              return (
                <li key={c.id} className="p-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium">{c.title}</p>
                      <p className="text-[#A3AED0] text-xs mt-0.5">
                        من {c.max_points} — حالياً: {computed.toFixed(1)}
                        {c.scoring_mode === 'manual' && ' · تقييم يدوي/استبيان'}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {c.scoring_mode === 'stars' && (
                        <StarScoreInput
                          value={input?.stars ?? 0}
                          onChange={(stars) => patch(c.id, { stars, score: null })}
                          disabled={readOnly}
                        />
                      )}
                      {(c.scoring_mode === 'points' || c.scoring_mode === 'manual') && (
                        <input
                          type="number"
                          min={0}
                          max={c.max_points}
                          step={0.5}
                          disabled={readOnly}
                          className={`${academicInputClass} w-24 text-center`}
                          value={input?.score ?? ''}
                          onChange={(e) =>
                            patch(c.id, {
                              score: e.target.value === '' ? null : +e.target.value,
                              stars: null,
                            })
                          }
                        />
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="ملاحظات (اختياري)"
                    disabled={readOnly}
                    className={`${academicInputClass} text-xs`}
                    value={input?.notes ?? ''}
                    onChange={(e) => patch(c.id, { notes: e.target.value })}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="rounded-xl bg-gold-500/10 border border-gold-400/20 px-4 py-3 flex flex-wrap justify-between gap-2">
        <span className="text-gold-200 text-sm font-medium">مجموع هذا التقييم</span>
        <span className="text-white font-bold">
          {totalScore.toFixed(1)} / {maxTotal}
        </span>
      </div>

      <label className="block">
        <span className="text-[#A3AED0] text-xs mb-1 block">ملاحظات عامة</span>
        <textarea
          className={`${academicInputClass} min-h-[72px]`}
          value={notes}
          disabled={readOnly}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={academicBtnPrimary} disabled={saving} onClick={handleSave}>
            حفظ التقييم
          </button>
        </div>
      )}
    </div>
  );
}
