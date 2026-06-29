import { Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import {
  AXIS_OPTIONS,
  EXAM_TYPE_OPTIONS,
  type ExamPointsBand,
  type ExamPointsPolicy,
} from '../../lib/examPointsPolicy';
import clsx from 'clsx';

type Props = {
  policy: ExamPointsPolicy;
  onChange: (policy: ExamPointsPolicy) => void;
  gradeOptions: string[];
};

export function ExamPointsPolicySettings({ policy, onChange, gradeOptions }: Props) {
  const { data: activities = [] } = useQuery({
    queryKey: ['activities', 'by-axis', policy.target_axis],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('id, name, category, default_points')
        .eq('category', policy.target_axis)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string; category: string; default_points: number }[];
    },
  });

  const toggleExamType = (type: string) => {
    const next = policy.exam_types.includes(type as ExamPointsPolicy['exam_types'][number])
      ? policy.exam_types.filter((t) => t !== type)
      : [...policy.exam_types, type as ExamPointsPolicy['exam_types'][number]];
    onChange({ ...policy, exam_types: next });
  };

  const toggleGrade = (grade: string) => {
    const next = policy.grades.includes(grade)
      ? policy.grades.filter((g) => g !== grade)
      : [...policy.grades, grade];
    onChange({ ...policy, grades: next });
  };

  const updateBand = (index: number, patch: Partial<ExamPointsBand>) => {
    const bands = [...policy.bands];
    bands[index] = { ...bands[index], ...patch };
    onChange({ ...policy, bands });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
        <input
          type="checkbox"
          checked={policy.enabled}
          onChange={(e) => onChange({ ...policy, enabled: e.target.checked })}
          className="rounded border-white/20"
        />
        تفعيل ربط الاختبارات بالمحاور (اقتراح معلّق — موافقة يدوية فقط)
      </label>

      {policy.enabled && (
        <>
          <div className="space-y-2">
            <span className="text-white/50 text-xs">أنواع الاختبار المشمولة</span>
            <div className="flex flex-wrap gap-2">
              {EXAM_TYPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleExamType(value)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs border transition-all',
                    policy.exam_types.includes(value)
                      ? 'border-gold-400/50 bg-gold-500/10 text-gold-300'
                      : 'border-white/10 text-white/40 hover:border-white/20'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-white/50 text-xs">المحور</span>
              <select
                value={policy.target_axis}
                onChange={(e) =>
                  onChange({
                    ...policy,
                    target_axis: e.target.value as ExamPointsPolicy['target_axis'],
                    activity_id: null,
                  })
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
              >
                {AXIS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-navy-900">
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-white/50 text-xs">النشاط المرتبط في المحور</span>
              <select
                value={policy.activity_id ?? ''}
                onChange={(e) =>
                  onChange({ ...policy, activity_id: e.target.value || null })
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
              >
                <option value="" className="bg-navy-900">
                  — اختر نشاطاً —
                </option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id} className="bg-navy-900">
                    {a.name} ({a.default_points} ن)
                  </option>
                ))}
              </select>
            </label>
          </div>

          {gradeOptions.length > 0 && (
            <div className="space-y-2">
              <span className="text-white/50 text-xs">
                الصفوف (فارغ = الكل)
              </span>
              <div className="flex flex-wrap gap-2">
                {gradeOptions.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGrade(g)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs border transition-all',
                      policy.grades.length === 0 || policy.grades.includes(g)
                        ? policy.grades.includes(g) || policy.grades.length === 0
                          ? 'border-blue-400/40 bg-blue-500/10 text-blue-300'
                          : 'border-white/10 text-white/40'
                        : 'border-white/10 text-white/40'
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {policy.grades.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...policy, grades: [] })}
                  className="text-xs text-white/40 hover:text-white/60"
                >
                  مسح التحديد — تطبيق على كل الصفوف
                </button>
              )}
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-white/50 text-xs">طريقة حساب النقاط المقترحة</span>
            <select
              value={policy.calculation_mode}
              onChange={(e) =>
                onChange({
                  ...policy,
                  calculation_mode: e.target.value as ExamPointsPolicy['calculation_mode'],
                })
              }
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
            >
              <option value="bands" className="bg-navy-900">شرائح حسب النسبة</option>
              <option value="per_correct" className="bg-navy-900">نقطة لكل إجابة صحيحة</option>
              <option value="fixed_pass" className="bg-navy-900">نقاط ثابتة عند النجاح</option>
            </select>
          </label>

          {policy.calculation_mode === 'bands' && (
            <div className="space-y-2">
              <span className="text-white/50 text-xs">الشرائح</span>
              {policy.bands.map((band, i) => (
                <div key={i} className="flex gap-2 items-center flex-wrap">
                  <span className="text-white/40 text-xs">من</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={band.min}
                    onChange={(e) => updateBand(i, { min: Number(e.target.value) })}
                    className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm"
                  />
                  <span className="text-white/40 text-xs">إلى</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={band.max}
                    onChange={(e) => updateBand(i, { max: Number(e.target.value) })}
                    className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm"
                  />
                  <span className="text-white/40 text-xs">=</span>
                  <input
                    type="number"
                    min={0}
                    value={band.points}
                    onChange={(e) => updateBand(i, { points: Number(e.target.value) })}
                    className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm"
                  />
                  <span className="text-white/40 text-xs">نقطة</span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({ ...policy, bands: policy.bands.filter((_, j) => j !== i) })
                    }
                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() =>
                  onChange({
                    ...policy,
                    bands: [...policy.bands, { min: 0, max: 59, points: 5 }],
                  })
                }
              >
                إضافة شريحة
              </Button>
            </div>
          )}

          {policy.calculation_mode === 'per_correct' && (
            <label className="block space-y-1">
              <span className="text-white/50 text-xs">نقاط لكل إجابة صحيحة</span>
              <input
                type="number"
                min={1}
                value={policy.per_correct_points}
                onChange={(e) =>
                  onChange({ ...policy, per_correct_points: Number(e.target.value) })
                }
                className="w-full max-w-xs bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
              />
            </label>
          )}

          {policy.calculation_mode === 'fixed_pass' && (
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <label className="block space-y-1">
                <span className="text-white/50 text-xs">نسبة النجاح %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={policy.pass_percent}
                  onChange={(e) =>
                    onChange({ ...policy, pass_percent: Number(e.target.value) })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-white/50 text-xs">النقاط عند النجاح</span>
                <input
                  type="number"
                  min={1}
                  value={policy.fixed_pass_points}
                  onChange={(e) =>
                    onChange({ ...policy, fixed_pass_points: Number(e.target.value) })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                />
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-white/50 text-xs">حد أدنى للاقتراح %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={policy.min_percent}
                onChange={(e) => onChange({ ...policy, min_percent: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-white/50 text-xs">حد أقصى/اختبار</span>
              <input
                type="number"
                min={0}
                value={policy.max_per_exam}
                onChange={(e) => onChange({ ...policy, max_per_exam: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-white/50 text-xs">حد أقصى/طالب/عام</span>
              <input
                type="number"
                min={0}
                value={policy.max_per_student_term}
                onChange={(e) =>
                  onChange({ ...policy, max_per_student_term: Number(e.target.value) })
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
            <input
              type="checkbox"
              checked={policy.activity_week_multiplier}
              onChange={(e) =>
                onChange({ ...policy, activity_week_multiplier: e.target.checked })
              }
              className="rounded border-white/20"
            />
            مضاعفة أسبوع النشاط على اقتراحات الاختبارات
          </label>

          <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
            <input
              type="checkbox"
              checked={policy.allow_edit_before_approve}
              onChange={(e) =>
                onChange({ ...policy, allow_edit_before_approve: e.target.checked })
              }
              className="rounded border-white/20"
            />
            السماح بتعديل النقاط قبل الاعتماد
          </label>

          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200/90 text-xs">
            جميع اقتراحات الاختبارات تُسجَّل بحالة «معلّق» ولا تدخل المحور إلا بعد موافقة رائد النشاط.
          </div>
        </>
      )}
    </div>
  );
}
