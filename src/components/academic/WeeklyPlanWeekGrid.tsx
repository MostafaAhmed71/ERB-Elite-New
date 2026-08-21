import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { Calendar, Check, LayoutGrid, List, Sparkles } from 'lucide-react';
import type { AcademicSchedulePeriod, AcademicWeeklyPlanEntry } from '../../lib/academic/types';
import { DAYS_AR, PERIODS_PER_DAY, weeklyPlanEntryKey } from '../../lib/academic/constants';
import { academicInputClass } from './AcademicUi';

export type WeeklyPlanEntriesMap = Record<string, AcademicWeeklyPlanEntry>;

export function entriesMapFromSchedule(periods: AcademicSchedulePeriod[]): WeeklyPlanEntriesMap {
  const map: WeeklyPlanEntriesMap = {};
  for (const p of periods) {
    if (!p.is_empty && p.subject.trim()) {
      const key = weeklyPlanEntryKey(p.day, p.period);
      map[key] = { day: p.day, period: p.period, subject: p.subject.trim(), lesson_topic: '' };
    }
  }
  return map;
}

export function entriesMapFromList(entries: AcademicWeeklyPlanEntry[]): WeeklyPlanEntriesMap {
  const map: WeeklyPlanEntriesMap = {};
  for (const e of entries) {
    map[weeklyPlanEntryKey(e.day, e.period)] = e;
  }
  return map;
}

export function entriesListFromMap(map: WeeklyPlanEntriesMap): AcademicWeeklyPlanEntry[] {
  return Object.values(map).sort(
    (a, b) =>
      DAYS_AR.indexOf(a.day) - DAYS_AR.indexOf(b.day) ||
      a.period - b.period,
  );
}

export function orderedTeacherSlotKeys(
  schedulePeriods: AcademicSchedulePeriod[],
  entries: WeeklyPlanEntriesMap,
): string[] {
  const keys: string[] = [];
  for (const day of DAYS_AR) {
    for (const period of PERIODS_PER_DAY) {
      const key = weeklyPlanEntryKey(day, period);
      const sched = schedulePeriods.find((p) => p.day === day && p.period === period);
      if (sched && !sched.is_empty && sched.subject.trim() && entries[key]) {
        keys.push(key);
      }
    }
  }
  return keys;
}

type ViewMode = 'quick' | 'grid';

type WeeklyPlanWeekGridProps = {
  schedulePeriods: AcademicSchedulePeriod[];
  entries: WeeklyPlanEntriesMap;
  onChange?: (map: WeeklyPlanEntriesMap) => void;
  readOnly?: boolean;
  noSchedule?: boolean;
};

function ProgressBar({ filled, total }: { filled: number; total: number }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const done = filled >= total && total > 0;
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-white text-sm font-semibold flex items-center gap-2">
          {done ? <Sparkles className="w-4 h-4 text-gold-400" /> : null}
          {done ? 'أحسنت! اكتملت كل الحصص' : `${filled} من ${total} حصة`}
        </span>
        <span className="text-gold-400 font-bold text-sm tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', done ? 'bg-gold-500' : 'bg-gradient-to-l from-gold-500 to-[#01B574]')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function QuickEntryList({
  slotKeys,
  entries,
  onChange,
}: {
  slotKeys: string[];
  entries: WeeklyPlanEntriesMap;
  onChange: (map: WeeklyPlanEntriesMap) => void;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const updateTopic = (key: string, lesson_topic: string) => {
    const current = entries[key];
    if (!current) return;
    onChange({ ...entries, [key]: { ...current, lesson_topic } });
  };

  const focusSlot = (index: number) => {
    const el = inputRefs.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const filledCount = slotKeys.filter((k) => entries[k]?.lesson_topic.trim()).length;

  return (
    <div className="space-y-3">
      <ProgressBar filled={filledCount} total={slotKeys.length} />
      <p className="text-[#A3AED0] text-xs">
        اكتب الموضوع واضغط Enter للانتقال للحصة التالية — أسرع من الجدول الكامل
      </p>
      <div className="space-y-2 max-h-[min(52vh,480px)] overflow-y-auto pr-1">
        {slotKeys.map((key, index) => {
          const entry = entries[key]!;
          const hasTopic = !!entry.lesson_topic.trim();
          return (
            <div
              key={key}
              className={clsx(
                'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl border transition-colors',
                hasTopic
                  ? 'bg-gold-500/10 border-gold-400/20'
                  : 'bg-white/[0.03] border-white/[0.06]',
              )}
            >
              <div className="flex items-center gap-2 sm:w-44 shrink-0">
                <span
                  className={clsx(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                    hasTopic ? 'bg-[#01B574]/20 text-[#01B574]' : 'bg-white/10 text-[#A3AED0]',
                  )}
                >
                  {hasTopic ? <Check className="w-3.5 h-3.5" /> : index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-white text-sm font-bold truncate">{entry.day}</p>
                  <p className="text-[#A3AED0] text-xs">
                    حصة {entry.period} · <span className="text-gold-400">{entry.subject}</span>
                  </p>
                </div>
              </div>
              <input
                ref={(el) => { inputRefs.current[index] = el; }}
                className={clsx(academicInputClass, 'flex-1 min-w-0')}
                placeholder={`موضوع ${entry.subject}...`}
                value={entry.lesson_topic}
                onChange={(e) => updateTopic(key, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (index < slotKeys.length - 1) focusSlot(index + 1);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
      {filledCount < slotKeys.length && (
        <button
          type="button"
          className="text-sm text-gold-400 font-semibold hover:underline"
          onClick={() => {
            const next = slotKeys.findIndex((k) => !entries[k]?.lesson_topic.trim());
            if (next >= 0) focusSlot(next);
          }}
        >
          انتقل لأول حصة فارغة ←
        </button>
      )}
    </div>
  );
}

export function WeeklyPlanWeekGrid({
  schedulePeriods,
  entries,
  onChange,
  readOnly = false,
  noSchedule = false,
}: WeeklyPlanWeekGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('quick');
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const scheduleByKey = useMemo(() => {
    const m = new Map<string, AcademicSchedulePeriod>();
    for (const p of schedulePeriods) {
      m.set(weeklyPlanEntryKey(p.day, p.period), p);
    }
    return m;
  }, [schedulePeriods]);

  const slotKeys = useMemo(
    () => orderedTeacherSlotKeys(schedulePeriods, entries),
    [schedulePeriods, entries],
  );

  const filledCount = useMemo(
    () => slotKeys.filter((k) => entries[k]?.lesson_topic.trim()).length,
    [slotKeys, entries],
  );

  const teacherSlotsCount = slotKeys.length;

  const updateTopic = (key: string, lesson_topic: string) => {
    if (!onChange || readOnly) return;
    const current = entries[key];
    if (!current) return;
    onChange({ ...entries, [key]: { ...current, lesson_topic } });
  };

  if (noSchedule) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-center">
        <Calendar className="w-10 h-10 text-amber-300 mx-auto mb-3" />
        <p className="text-white font-semibold mb-1">لا يوجد جدول لهذا الفصل</p>
        <p className="text-[#A3AED0] text-sm mb-4">أضف جدولك الدراسي أولاً — يستغرق دقيقة واحدة</p>
        <Link to="/academic/schedule" className="inline-flex items-center gap-2 text-gold-400 font-semibold text-sm hover:underline">
          إعداد الجدول الدراسي
        </Link>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="space-y-3">
        <ProgressBar filled={filledCount} total={teacherSlotsCount} />
        <p className="sm:hidden text-[11px] text-[#A3AED0]/80 px-1">اسحب الجدول أفقياً لرؤية باقي الحصص ←</p>
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] -mx-1 px-0">
          <table className="w-full min-w-[640px] text-sm border-collapse">
            <thead>
              <tr className="bg-white/[0.04]">
                <th className="p-3 text-[#A3AED0] font-semibold text-right border-b border-white/[0.06] w-24">اليوم</th>
                {PERIODS_PER_DAY.map((p) => (
                  <th key={p} className="p-3 text-[#A3AED0] font-semibold text-center border-b border-white/[0.06]">حصة {p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS_AR.map((day) => (
                <tr key={day} className="border-b border-white/[0.04] last:border-0">
                  <td className="p-3 font-bold text-white bg-white/[0.02]">{day}</td>
                  {PERIODS_PER_DAY.map((period) => {
                    const key = weeklyPlanEntryKey(day, period);
                    const entry = entries[key];
                    const hasTopic = !!entry?.lesson_topic.trim();
                    if (!entry) {
                      return (
                        <td key={period} className="p-2">
                          <div className="h-16 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.06]" />
                        </td>
                      );
                    }
                    return (
                      <td key={period} className="p-2">
                        <div className={clsx('h-16 rounded-xl p-2 flex flex-col justify-between border', hasTopic ? 'bg-gold-500/10 border-gold-400/25' : 'bg-white/[0.04] border-white/[0.08]')}>
                          <span className="text-[10px] text-gold-400 font-bold truncate">{entry.subject}</span>
                          <span className="text-xs text-white line-clamp-2">{hasTopic ? entry.lesson_topic : '—'}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[#A3AED0] text-sm">
          {viewMode === 'quick' ? 'أدخل المواضيع بالترتيب — سريع وسهل' : 'عرض الجدول الكامل'}
        </p>
        <div className="flex rounded-xl bg-white/[0.06] p-1 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setViewMode('quick')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              viewMode === 'quick' ? 'bg-gold-500 text-navy-950' : 'text-[#A3AED0] hover:text-white',
            )}
          >
            <List className="w-3.5 h-3.5" /> إدخال سريع
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              viewMode === 'grid' ? 'bg-gold-500 text-navy-950' : 'text-[#A3AED0] hover:text-white',
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> جدول
          </button>
        </div>
      </div>

      {viewMode === 'quick' && onChange ? (
        <QuickEntryList slotKeys={slotKeys} entries={entries} onChange={onChange} />
      ) : (
        <>
          <ProgressBar filled={filledCount} total={teacherSlotsCount} />
          <p className="sm:hidden text-[11px] text-[#A3AED0]/80 px-1">اسحب الجدول أفقياً لرؤية باقي الحصص ←</p>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
            <table className="w-full min-w-[640px] text-sm border-collapse">
              <thead>
                <tr className="bg-white/[0.04]">
                  <th className="p-3 text-[#A3AED0] font-semibold text-right border-b border-white/[0.06] w-24">اليوم</th>
                  {PERIODS_PER_DAY.map((p) => (
                    <th key={p} className="p-3 text-[#A3AED0] font-semibold text-center border-b border-white/[0.06]">حصة {p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS_AR.map((day) => (
                  <tr key={day} className="border-b border-white/[0.04] last:border-0">
                    <td className="p-3 font-bold text-white bg-white/[0.02]">{day}</td>
                    {PERIODS_PER_DAY.map((period) => {
                      const key = weeklyPlanEntryKey(day, period);
                      const sched = scheduleByKey.get(key);
                      const isTeacherSlot = !!sched && !sched.is_empty && !!sched.subject.trim();
                      const entry = entries[key];
                      const isActive = activeKey === key;
                      const hasTopic = !!entry?.lesson_topic.trim();

                      if (!isTeacherSlot) {
                        return (
                          <td key={period} className="p-1.5">
                            <div className="h-14 rounded-lg bg-white/[0.02]" />
                          </td>
                        );
                      }

                      return (
                        <td key={period} className="p-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveKey(isActive ? null : key)}
                            className={clsx(
                              'w-full h-14 rounded-lg p-1.5 text-right flex flex-col justify-between border transition-all',
                              isActive && 'ring-2 ring-gold-400/60',
                              hasTopic ? 'bg-gold-500/10 border-gold-400/25' : 'bg-[#7551FF]/10 border-[#7551FF]/25',
                            )}
                          >
                            <span className="text-[9px] text-gold-400 font-bold truncate">{sched!.subject}</span>
                            <span className={clsx('text-[10px] line-clamp-2', hasTopic ? 'text-white' : 'text-[#A3AED0]')}>
                              {hasTopic ? entry!.lesson_topic : '...'}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeKey && entries[activeKey] && (
            <div className="rounded-2xl bg-[#1B254B] border border-gold-400/25 p-4 space-y-2">
              <p className="text-sm text-white">
                {entries[activeKey].day} — حصة {entries[activeKey].period} — {entries[activeKey].subject}
              </p>
              <input
                autoFocus
                className={academicInputClass}
                placeholder="موضوع الدرس..."
                value={entries[activeKey].lesson_topic}
                onChange={(e) => updateTopic(activeKey, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setActiveKey(null);
                  }
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
