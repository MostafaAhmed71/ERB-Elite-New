import { useState } from 'react';
import { Calendar, Wand2 } from 'lucide-react';
import type { AcademicSemester, AcademicWeekCalendarsConfig, WeekDateRange } from '../../lib/academic/types';
import {
  SEMESTER_LABELS,
  weekOptionsForSemester,
  maxWeeksForSemester,
  SCHOOL_DAYS_PER_WEEK,
} from '../../lib/academic/constants';
import {
  generateWeekRanges,
  formatWeekDateRange,
  resolveCurrentWeekFromCalendar,
} from '../../lib/academic/semesterWeekCalendar';
import { academicInputClass, academicBtnSecondary } from './AcademicUi';

type Props = {
  value: AcademicWeekCalendarsConfig;
  onChange: (config: AcademicWeekCalendarsConfig) => void;
};

export function SemesterWeekCalendarEditor({ value, onChange }: Props) {
  const [semester, setSemester] = useState<AcademicSemester>(1);
  const [genStart, setGenStart] = useState(new Date().toISOString().slice(0, 10));

  const weeks = value.calendars[semester] ?? [];
  const current = resolveCurrentWeekFromCalendar(value);

  const setWeeks = (list: WeekDateRange[]) => {
    onChange({
      calendars: { ...value.calendars, [semester]: list },
    });
  };

  const ensureWeeks = (): WeekDateRange[] => {
    if (weeks.length) return [...weeks];
    const empty = weekOptionsForSemester(semester).map((n) => ({
      week_number: n,
      start_date: '',
      end_date: '',
    }));
    setWeeks(empty);
    return empty;
  };

  const updateWeek = (weekNumber: number, field: 'start_date' | 'end_date', v: string) => {
    const base = weeks.length ? [...weeks] : ensureWeeks();
    const idx = base.findIndex((w) => w.week_number === weekNumber);
    if (idx >= 0) {
      base[idx] = { ...base[idx], [field]: v };
    } else {
      base.push({ week_number: weekNumber, start_date: field === 'start_date' ? v : '', end_date: field === 'end_date' ? v : '' });
    }
    setWeeks(base.sort((a, b) => a.week_number - b.week_number));
  };

  const autoGenerate = () => {
    if (!genStart) return;
    setWeeks(generateWeekRanges(semester, genStart, SCHOOL_DAYS_PER_WEEK));
  };

  const initEmpty = () => {
    setWeeks(
      weekOptionsForSemester(semester).map((n) => ({
        week_number: n,
        start_date: '',
        end_date: '',
      })),
    );
  };

  const displayWeeks =
    weeks.length > 0
      ? weeks
      : weekOptionsForSemester(semester).map((n) => ({
          week_number: n,
          start_date: '',
          end_date: '',
        }));

  return (
    <div className="border-t border-white/10 pt-5 space-y-4">
      <div className="flex items-center gap-2 text-white font-semibold text-sm">
        <Calendar className="w-4 h-4 text-gold-400" />
        مواعيد الأسابيع الدراسية
      </div>
      <p className="text-[#A3AED0] text-xs leading-relaxed">
        حدّد تاريخ بداية ونهاية كل أسبوع. التوليد التلقائي يحسب كل أسبوع بـ {SCHOOL_DAYS_PER_WEEK} أيام دراسية.
        يتبدّل الأسبوع الحالي تلقائياً عند انتهاء المدة، ولا يستطيع المعلم إدخال خطة لأسبوع منتهٍ.
      </p>

      {current && (
        <p className="text-xs text-[#01B574] font-medium rounded-lg bg-[#01B574]/10 border border-[#01B574]/20 px-3 py-2">
          الأسبوع النشط الآن: {SEMESTER_LABELS[current.semester]} — الأسبوع {current.week}
          {current.range ? ` (${formatWeekDateRange(current.range)})` : ''}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {([1, 2] as AcademicSemester[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSemester(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              semester === s ? 'bg-gold-500 text-navy-950' : 'bg-white/10 text-white'
            }`}
          >
            {SEMESTER_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <label className="block text-xs text-[#A3AED0] flex-1 min-w-[140px]">
          توليد تلقائي من تاريخ
          <input
            type="date"
            className={academicInputClass}
            value={genStart}
            onChange={(e) => setGenStart(e.target.value)}
          />
        </label>
        <button type="button" className={academicBtnSecondary} onClick={autoGenerate}>
          <Wand2 className="w-4 h-4" />
          توليد {maxWeeksForSemester(semester)} أسبوع ({SCHOOL_DAYS_PER_WEEK} أيام لكل أسبوع)
        </button>
        <button type="button" className={academicBtnSecondary} onClick={initEmpty}>
          جدول فارغ
        </button>
      </div>

      <div className="max-h-[360px] overflow-y-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#0d1638] text-[#A3AED0] text-xs">
            <tr>
              <th className="p-2 text-right font-semibold">الأسبوع</th>
              <th className="p-2 text-right font-semibold">من</th>
              <th className="p-2 text-right font-semibold">إلى</th>
            </tr>
          </thead>
          <tbody>
            {displayWeeks.map((w) => {
              const isCurrent =
                current?.semester === semester && current.week === w.week_number;
              return (
                <tr
                  key={w.week_number}
                  className={`border-t border-white/[0.04] ${isCurrent ? 'bg-gold-500/10' : ''}`}
                >
                  <td className="p-2 text-white font-medium whitespace-nowrap">
                    {w.week_number}
                    {isCurrent && (
                      <span className="text-[10px] text-gold-400 mr-1">(الحالي)</span>
                    )}
                  </td>
                  <td className="p-1.5">
                    <input
                      type="date"
                      className={`${academicInputClass} text-xs py-1.5`}
                      value={w.start_date}
                      onChange={(e) => updateWeek(w.week_number, 'start_date', e.target.value)}
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="date"
                      className={`${academicInputClass} text-xs py-1.5`}
                      value={w.end_date}
                      onChange={(e) => updateWeek(w.week_number, 'end_date', e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
