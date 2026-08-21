import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { teacherEvaluationService } from '../../../lib/teacherEvaluation/service';
import type { EvalSource, TeacherEvalCriterion } from '../../../lib/teacherEvaluation/types';
import {
  AcademicLayout,
  AcademicPageHeader,
  academicInputClass,
  academicBtnPrimary,
  academicBtnSecondary,
} from '../../../components/academic/AcademicUi';

const SOURCE_LABELS: Record<EvalSource, string> = {
  principal: 'مدير',
  deputy: 'وكيل/مشرف',
  student: 'طلاب',
  parent: 'أولياء',
  self: 'ذاتي',
};

export function PrincipalEvaluationSettingsPage() {
  const qc = useQueryClient();
  const [newAxisTitle, setNewAxisTitle] = useState('');
  const [editingCriterion, setEditingCriterion] = useState<Partial<TeacherEvalCriterion> | null>(null);

  const { data: axes = [] } = useQuery({
    queryKey: ['teval-axes'],
    queryFn: teacherEvaluationService.listAxes,
  });
  const { data: criteria = [] } = useQuery({
    queryKey: ['teval-criteria'],
    queryFn: teacherEvaluationService.listCriteria,
  });
  const { data: weights = [] } = useQuery({
    queryKey: ['teval-weights'],
    queryFn: teacherEvaluationService.listSourceWeights,
  });
  const { data: dedTypes = [] } = useQuery({
    queryKey: ['teval-ded-types'],
    queryFn: teacherEvaluationService.listDeductionTypes,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['teval-axes'] });
    qc.invalidateQueries({ queryKey: ['teval-criteria'] });
    qc.invalidateQueries({ queryKey: ['teval-weights'] });
    qc.invalidateQueries({ queryKey: ['teval-ded-types'] });
  };

  const addAxisMut = useMutation({
    mutationFn: () => teacherEvaluationService.saveAxis({ title: newAxisTitle, sort_order: axes.length + 1 }),
    onSuccess: () => { setNewAxisTitle(''); invalidate(); },
  });

  const saveCriterionMut = useMutation({
    mutationFn: () => teacherEvaluationService.saveCriterion(editingCriterion as TeacherEvalCriterion & { axis_id: string; title: string; max_points: number }),
    onSuccess: () => { setEditingCriterion(null); invalidate(); },
  });

  const saveWeightsMut = useMutation({
    mutationFn: (w: typeof weights) => teacherEvaluationService.saveSourceWeights(w),
    onSuccess: invalidate,
  });

  const totalWeight = weights.reduce((s, w) => s + Number(w.weight_percent), 0);
  const totalCriteriaPoints = criteria.filter((c) => c.is_active).reduce((s, c) => s + Number(c.max_points), 0);

  return (
    <AcademicLayout size="4xl">
      <AcademicPageHeader title="إعداد بنود التقييم" backTo="/principal/evaluation" />

      {/* أوزان المصادر */}
      <section className="horizon-card rounded-[20px] bg-[#111c44] p-5 mb-5 space-y-3">
        <h3 className="text-white font-bold">أوزان مصادر التقييم</h3>
        <p className="text-[#A3AED0] text-xs">المجموع يجب أن يكون 100% (حالياً: {totalWeight}%)</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {weights.map((w) => (
            <label key={w.source} className="block text-sm">
              <span className="text-[#A3AED0] text-xs">{w.label_ar}</span>
              <input
                type="number"
                min={0}
                max={100}
                className={academicInputClass}
                value={w.weight_percent}
                onChange={(e) => {
                  const next = weights.map((x) =>
                    x.source === w.source ? { ...x, weight_percent: +e.target.value } : x,
                  );
                  qc.setQueryData(['teval-weights'], next);
                }}
              />
            </label>
          ))}
        </div>
        <button type="button" className={academicBtnPrimary} onClick={() => saveWeightsMut.mutate(weights)}>
          حفظ الأوزان
        </button>
      </section>

      {/* المحاور */}
      <section className="horizon-card rounded-[20px] bg-[#111c44] p-5 mb-5 space-y-3">
        <h3 className="text-white font-bold">المحاور ({axes.length})</h3>
        <ul className="space-y-1 text-sm text-white">
          {axes.map((a) => (
            <li key={a.id} className="flex justify-between py-1 border-b border-white/[0.04]">
              <span>{a.title}</span>
              <span className="text-[#A3AED0]">
                {criteria.filter((c) => c.axis_id === a.id && c.is_active).length} بنود
              </span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            className={academicInputClass}
            placeholder="محور جديد..."
            value={newAxisTitle}
            onChange={(e) => setNewAxisTitle(e.target.value)}
          />
          <button type="button" className={academicBtnSecondary} disabled={!newAxisTitle.trim()} onClick={() => addAxisMut.mutate()}>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* البنود */}
      <section className="horizon-card rounded-[20px] bg-[#111c44] p-5 mb-5 space-y-3">
        <div className="flex flex-wrap justify-between gap-2">
          <h3 className="text-white font-bold">البنود (إجمالي {totalCriteriaPoints} درجة)</h3>
          <button
            type="button"
            className={academicBtnSecondary}
            onClick={() =>
              setEditingCriterion({
                axis_id: axes[0]?.id ?? '',
                title: '',
                max_points: 5,
                scoring_mode: 'stars',
                allowed_sources: ['principal', 'deputy', 'self'],
              })
            }
          >
            <Plus className="w-4 h-4" /> بند جديد
          </button>
        </div>

        {editingCriterion && (
          <div className="rounded-xl border border-gold-400/25 bg-gold-500/5 p-4 space-y-3">
            <input
              className={academicInputClass}
              placeholder="اسم البند"
              value={editingCriterion.title ?? ''}
              onChange={(e) => setEditingCriterion({ ...editingCriterion, title: e.target.value })}
            />
            <div className="grid sm:grid-cols-3 gap-2">
              <select
                className={academicInputClass}
                value={editingCriterion.axis_id ?? ''}
                onChange={(e) => setEditingCriterion({ ...editingCriterion, axis_id: e.target.value })}
              >
                {axes.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
              <input
                type="number"
                className={academicInputClass}
                placeholder="الدرجة"
                value={editingCriterion.max_points ?? 5}
                onChange={(e) => setEditingCriterion({ ...editingCriterion, max_points: +e.target.value })}
              />
              <select
                className={academicInputClass}
                value={editingCriterion.scoring_mode ?? 'stars'}
                onChange={(e) =>
                  setEditingCriterion({
                    ...editingCriterion,
                    scoring_mode: e.target.value as TeacherEvalCriterion['scoring_mode'],
                  })
                }
              >
                <option value="stars">نجوم 1-5</option>
                <option value="points">درجة مباشرة</option>
                <option value="manual">يدوي/استبيان</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['principal', 'deputy', 'student', 'parent', 'self'] as EvalSource[]).map((src) => {
                const on = editingCriterion.allowed_sources?.includes(src);
                return (
                  <button
                    key={src}
                    type="button"
                    className={`px-2 py-1 rounded-full text-xs ${on ? 'bg-gold-500 text-navy-950' : 'bg-white/10 text-white'}`}
                    onClick={() => {
                      const list = editingCriterion.allowed_sources ?? [];
                      setEditingCriterion({
                        ...editingCriterion,
                        allowed_sources: on ? list.filter((s) => s !== src) : [...list, src],
                      });
                    }}
                  >
                    {SOURCE_LABELS[src]}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button type="button" className={academicBtnPrimary} onClick={() => saveCriterionMut.mutate()}>
                حفظ
              </button>
              <button type="button" className={academicBtnSecondary} onClick={() => setEditingCriterion(null)}>
                إلغاء
              </button>
            </div>
          </div>
        )}

        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {axes.map((axis) => (
            <div key={axis.id}>
              <p className="text-gold-300 text-xs font-semibold mb-1 mt-3">{axis.title}</p>
              {criteria
                .filter((c) => c.axis_id === axis.id)
                .map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 py-2 border-b border-white/[0.04] text-sm"
                  >
                    <div className="min-w-0">
                      <span className="text-white">{c.title}</span>
                      <span className="text-[#A3AED0] text-xs mr-2">
                        {c.max_points} · {c.scoring_mode}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="text-gold-400 text-xs shrink-0"
                      onClick={() => setEditingCriterion(c)}
                    >
                      تعديل
                    </button>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </section>

      {/* أنواع الخصومات */}
      <section className="horizon-card rounded-[20px] bg-[#111c44] p-5 space-y-2">
        <h3 className="text-white font-bold">أنواع الخصومات التلقائية</h3>
        <ul className="text-sm text-[#A3AED0] space-y-1">
          {dedTypes.map((d) => (
            <li key={d.id} className="flex justify-between">
              <span>{d.title}</span>
              <span>−{d.default_points}</span>
            </li>
          ))}
        </ul>
      </section>
    </AcademicLayout>
  );
}
