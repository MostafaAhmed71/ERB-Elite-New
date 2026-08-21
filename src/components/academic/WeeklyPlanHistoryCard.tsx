import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Calendar, ChevronDown, Pencil, Trash2, BookOpen, Check, AlertCircle } from 'lucide-react';
import type { AcademicWeeklyPlan, AcademicWeeklyPlanEntry } from '../../lib/academic/types';
import { DAYS_AR, formatGradeSection, formatSemesterWeek } from '../../lib/academic/constants';
import { filterEntriesForTeacher, buildWeeklyGrid, type ClassScheduleSlot } from '../../lib/academic/weeklyPlanHelpers';
import { entriesListFromMap, entriesMapFromList } from './WeeklyPlanWeekGrid';
import { WeeklyPlanMonitorView, computeWeeklyGridStats } from './WeeklyPlanFullGrid';

type WeeklyPlanHistoryCardProps = {
  plan: AcademicWeeklyPlan;
  isTeacher: boolean;
  teacherId?: string;
  showTeacher?: boolean;
  scheduleSlots?: ClassScheduleSlot[];
  onEdit?: () => void;
  onDelete?: () => void;
};

function groupEntriesByDay(entries: AcademicWeeklyPlanEntry[]): Map<string, AcademicWeeklyPlanEntry[]> {
  const map = new Map<string, AcademicWeeklyPlanEntry[]>();
  for (const day of DAYS_AR) {
    const dayEntries = entries.filter((e) => e.day === day && e.lesson_topic?.trim());
    if (dayEntries.length) map.set(day, dayEntries);
  }
  return map;
}

export function WeeklyPlanHistoryCard({
  plan,
  isTeacher,
  teacherId,
  showTeacher = false,
  scheduleSlots,
  onEdit,
  onDelete,
}: WeeklyPlanHistoryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const allEntries = plan.entries as AcademicWeeklyPlanEntry[];
  const scopedEntries = useMemo(() => {
    if (isTeacher && teacherId) {
      return filterEntriesForTeacher(allEntries, teacherId, plan.teacher_id);
    }
    return allEntries;
  }, [allEntries, isTeacher, teacherId, plan.teacher_id]);

  const contributors = useMemo(() => {
    const names = new Set<string>();
    for (const e of allEntries) {
      if (e.lesson_topic?.trim() && e.teacher_name) names.add(e.teacher_name);
    }
    return [...names];
  }, [allEntries]);

  const filledEntries = useMemo(
    () => entriesListFromMap(entriesMapFromList(scopedEntries)).filter((e) => e.lesson_topic?.trim()),
    [scopedEntries],
  );
  const byDay = useMemo(() => groupEntriesByDay(filledEntries), [filledEntries]);

  const useFullGrid = !!scheduleSlots && scheduleSlots.length > 0;

  const gridStats = useMemo(() => {
    if (!useFullGrid || !scheduleSlots) return null;
    return computeWeeklyGridStats(buildWeeklyGrid(scopedEntries, scheduleSlots));
  }, [useFullGrid, scopedEntries, scheduleSlots]);

  const filled = gridStats ? gridStats.filledCount : filledEntries.length;
  const totalSlots = gridStats ? gridStats.scheduled : scopedEntries.length;
  const pct = totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 0;
  const complete = filled > 0 && filled >= totalSlots;

  const previewDays = [...byDay.entries()].slice(0, expanded ? undefined : 2);

  const updatedLabel = plan.updated_at || plan.created_at
    ? new Date(plan.updated_at ?? plan.created_at!).toLocaleDateString('ar-SA', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <article
      className={clsx(
        'rounded-2xl border overflow-hidden transition-shadow',
        complete
          ? 'bg-gradient-to-br from-[#111c44] to-[#0d1638] border-gold-400/15 shadow-lg shadow-gold-500/5'
          : 'bg-[#111c44] border-white/[0.06]',
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className={clsx(
              'w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border',
              complete
                ? 'bg-gold-500/15 border-gold-400/30'
                : 'bg-[#7551FF]/10 border-[#7551FF]/25',
            )}
          >
            <Calendar className={clsx('w-4 h-4 mb-0.5', complete ? 'text-gold-400' : 'text-[#A3AED0]')} />
            <span className="text-white font-bold text-lg leading-none tabular-nums">{plan.week_number}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-white font-bold text-base sm:text-lg truncate">
                {formatGradeSection(plan.education_level, plan.grade, plan.section)}
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[#A3AED0] border border-white/[0.08]">
                {formatSemesterWeek(plan.semester ?? 1, plan.week_number)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A3AED0]">
              {showTeacher && contributors.length > 0 ? (
                <span className="text-gold-400/90 font-medium">{contributors.join(' · ')}</span>
              ) : showTeacher ? (
                <span className="text-gold-400/90 font-medium">{plan.teacher_name}</span>
              ) : null}
              {isTeacher && (
                <span className="text-[#7551FF]/90 font-medium">خطة مشتركة للفصل</span>
              )}
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {gridStats ? `${filled}/${totalSlots} حصة` : `${filled} حصة`}
              </span>
              {gridStats && gridStats.pending > 0 && (
                <span className="text-amber-300 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {gridStats.pending} فارغة
                </span>
              )}
              {updatedLabel && <span>آخر تحديث {updatedLabel}</span>}
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs text-[#A3AED0]">
                  {complete ? (
                    <span className="text-[#01B574] font-semibold inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> مكتملة
                    </span>
                  ) : (
                    'التقدم'
                  )}
                </span>
                <span className="text-xs font-bold text-gold-400 tabular-nums">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all',
                    complete ? 'bg-gold-500' : 'bg-gradient-to-l from-gold-500 to-[#7551FF]',
                  )}
                  style={{ width: `${Math.max(pct, filled > 0 ? 8 : 0)}%` }}
                />
              </div>
            </div>
          </div>

          {isTeacher && (onEdit || onDelete) && (
            <div className="flex gap-1 shrink-0">
              {onEdit && (
                <button
                  type="button"
                  className="p-2.5 rounded-xl text-gold-400 hover:bg-gold-400/10 border border-transparent hover:border-gold-400/20 transition-colors"
                  onClick={onEdit}
                  title="تعديل"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="p-2.5 rounded-xl text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-colors"
                  onClick={onDelete}
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {useFullGrid ? (
          <WeeklyPlanMonitorView
            className="mt-4"
            entries={scopedEntries}
            scheduleSlots={scheduleSlots}
            showTeacher={!isTeacher}
          />
        ) : filled === 0 ? (
          <p className="mt-4 text-sm text-[#A3AED0] italic rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2">
            لا مواضيع مسجّلة في هذه الخطة
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {previewDays.map(([day, dayEntries]) => (
              <div
                key={day}
                className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5"
              >
                <p className="text-xs font-bold text-gold-400/90 mb-1.5">{day}</p>
                <ul className="space-y-1">
                  {dayEntries.map((e) => (
                    <li key={`${e.day}_${e.period}`} className="flex items-start gap-2 text-sm">
                      <span className="shrink-0 w-5 h-5 rounded-md bg-white/[0.06] text-[#A3AED0] text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {e.period}
                      </span>
                      <span className="min-w-0 text-white/90">
                        <span className="text-gold-400/80 font-semibold">{e.subject}</span>
                        <span className="text-[#A3AED0] mx-1">—</span>
                        <span>{e.lesson_topic}</span>
                        {!isTeacher && e.teacher_name && (
                          <span className="text-[#7551FF]/80 text-xs mr-2">({e.teacher_name})</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {!useFullGrid && filled > 0 && byDay.size > 2 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors"
          >
            {expanded ? 'إخفاء التفاصيل' : `عرض كل الأيام (${byDay.size})`}
            <ChevronDown className={clsx('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
          </button>
        )}
      </div>
    </article>
  );
}
