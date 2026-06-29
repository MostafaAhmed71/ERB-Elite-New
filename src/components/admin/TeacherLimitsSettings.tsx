import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { TeacherLimitRow, TeacherPointsLimits } from '../../lib/teacherPointsLimits';

type Props = {
  limits: TeacherPointsLimits;
  teachers: TeacherLimitRow[];
  onChangeLimits: (limits: TeacherPointsLimits) => void;
  onChangeTeachers: (rows: TeacherLimitRow[]) => void;
  applyDefaultsToAll: boolean;
  onApplyDefaultsToAllChange: (value: boolean) => void;
};

export function TeacherLimitsSettings({
  limits,
  teachers,
  onChangeLimits,
  onChangeTeachers,
  applyDefaultsToAll,
  onApplyDefaultsToAllChange,
}: Props) {
  const [search, setSearch] = useState('');

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.subject ?? '').toLowerCase().includes(q)
    );
  }, [search, teachers]);

  const updateTeacher = (teacherId: string, patch: Partial<TeacherLimitRow>) => {
    onChangeTeachers(
      teachers.map((row) => (row.teacherId === teacherId ? { ...row, ...patch } : row))
    );
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 max-w-lg">
        <div>
          <h3 className="text-white font-semibold text-sm">الحد الافتراضي للمعلمين الجدد</h3>
          <p className="text-white/45 text-xs mt-1">
            يُطبَّق تلقائياً عند إضافة معلم جديد. يمكنك تخصيص حد مختلف لكل معلم من الجدول أدناه.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-white/50 text-xs">الحد الأسبوعي الافتراضي</span>
          <input
            type="number"
            min={1}
            required
            value={limits.weekly_limit}
            onChange={(e) =>
              onChangeLimits({ ...limits, weekly_limit: Math.max(1, Number(e.target.value) || 1) })
            }
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-white/50 text-xs">الحد اليومي الافتراضي (فارغ = بدون حد يومي)</span>
          <input
            type="number"
            min={1}
            value={limits.daily_limit ?? ''}
            onChange={(e) =>
              onChangeLimits({
                ...limits,
                daily_limit: e.target.value === '' ? null : Math.max(1, Number(e.target.value)),
              })
            }
            placeholder="بدون حد يومي"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          />
        </label>

        <label className="flex items-start gap-2 text-sm text-white/75 cursor-pointer">
          <input
            type="checkbox"
            checked={applyDefaultsToAll}
            onChange={(e) => onApplyDefaultsToAllChange(e.target.checked)}
            className="mt-1 rounded border-white/20"
          />
          <span>
            تطبيق الحد الافتراضي على <strong className="text-gold-400">جميع</strong> المعلمين الحاليين
            عند الحفظ (سيستبدل الحدود المخصّصة)
          </span>
        </label>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-white font-semibold text-sm">حدود مخصّصة لكل معلم</h3>
            <p className="text-white/45 text-xs mt-1">
              {teachers.length} معلم — يمكن أن يختلف الحد الأسبوعي من معلم لآخر
            </p>
          </div>
          <div className="relative min-w-[200px]">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم المعلم أو المادة..."
              className="w-full rounded-xl border border-white/10 bg-navy-900/50 py-2 pr-10 pl-3 text-xs text-white placeholder:text-white/20 focus:border-gold-400/50 focus:outline-none"
            />
          </div>
        </div>

        {teachers.length === 0 ? (
          <p className="text-center text-sm text-white/30 py-8">لا يوجد معلمون مسجّلون</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full text-sm text-right">
              <thead className="bg-white/5 text-white/45 text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">المعلم</th>
                  <th className="px-4 py-3 font-medium">المادة</th>
                  <th className="px-4 py-3 font-medium">الحد الأسبوعي</th>
                  <th className="px-4 py-3 font-medium">الحد اليومي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/75">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.teacherId} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{teacher.name}</td>
                    <td className="px-4 py-3 text-white/45 whitespace-nowrap">{teacher.subject ?? '—'}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        value={teacher.weekly_limit}
                        onChange={(e) =>
                          updateTeacher(teacher.teacherId, {
                            weekly_limit: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm tabular-nums"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        value={teacher.daily_limit ?? ''}
                        onChange={(e) =>
                          updateTeacher(teacher.teacherId, {
                            daily_limit:
                              e.target.value === '' ? null : Math.max(1, Number(e.target.value)),
                          })
                        }
                        placeholder="—"
                        className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm tabular-nums"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs">
          الطلبات المعلّقة والمعتمدة تُحسب ضمن الاستهلاك الأسبوعي. إذا لم تفعّل «تطبيق على الجميع»،
          تُحفظ الحدود المخصّصة لكل معلم دون المساس بالباقي.
        </div>
      </section>
    </div>
  );
}
