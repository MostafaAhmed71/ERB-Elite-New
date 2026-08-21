import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { UserX, AlertCircle } from 'lucide-react';
import type { AcademicWeeklyPlanEntry } from '../../lib/academic/types';
import { DAYS_AR } from '../../lib/academic/constants';
import {
  buildWeeklyGrid,
  type ClassScheduleSlot,
  type WeeklyGridCell,
} from '../../lib/academic/weeklyPlanHelpers';

export function computeWeeklyGridStats(grid: WeeklyGridCell[][]) {
  let filledCount = 0;
  let scheduled = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.status === 'filled') {
        filledCount += 1;
        scheduled += 1;
      } else if (cell.status === 'pending') {
        scheduled += 1;
      }
    }
  }
  return { filledCount, scheduled, pending: scheduled - filledCount };
}

function WeeklyGridCellView({ cell, showTeacher }: { cell: WeeklyGridCell; showTeacher: boolean }) {
  const [revealed, setRevealed] = useState(false);

  if (cell.status === 'free') {
    return (
      <div className="rounded-lg px-2 py-2 border border-dashed border-white/[0.06] bg-white/[0.01] flex items-center gap-1.5 min-h-[46px]">
        <span className="shrink-0 w-5 h-5 rounded-md bg-white/[0.04] text-white/30 text-[10px] font-bold flex items-center justify-center">
          {cell.period}
        </span>
        <span className="text-[10px] text-white/25">لا حصة</span>
      </div>
    );
  }

  if (cell.status === 'filled') {
    return (
      <div className="rounded-lg px-2 py-2 border border-white/[0.08] bg-gradient-to-br from-[#01B574]/15 to-[#01B574]/5 min-h-[46px]">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="shrink-0 w-5 h-5 rounded-md bg-[#01B574]/20 text-[#01B574] text-[10px] font-bold flex items-center justify-center">
            {cell.period}
          </span>
          <span className="text-[11px] font-bold text-gold-400/90 truncate">{cell.subject}</span>
        </div>
        <p className="text-[11px] text-white/85 line-clamp-2 leading-snug">{cell.lessonTopic}</p>
        {showTeacher && cell.teacherName && (
          <p className="text-[10px] text-[#7551FF]/80 truncate mt-0.5">{cell.teacherName}</p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setRevealed((v) => !v)}
      className="text-right rounded-lg px-2 py-2 border border-dashed border-amber-500/30 bg-amber-500/[0.06] hover:bg-amber-500/[0.12] transition-colors min-h-[46px] w-full"
      title="اضغط لعرض المعلم المسؤول"
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="shrink-0 w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center">
          {cell.period}
        </span>
        <span className="text-[11px] font-semibold text-amber-200/90 truncate">{cell.subject}</span>
      </div>
      {revealed ? (
        <p className="text-[10px] text-amber-100 flex items-center gap-1 leading-snug">
          <UserX className="w-3 h-3 shrink-0" />
          <span className="truncate">لم يُدخلها: {cell.teacherName}</span>
        </p>
      ) : (
        <p className="text-[10px] text-amber-300/70 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" /> فارغة — اضغط للمعلم
        </p>
      )}
    </button>
  );
}

function FullWeeklyGrid({
  grid,
  showTeacher,
}: {
  grid: WeeklyGridCell[][];
  showTeacher: boolean;
}) {
  return (
    <div className="space-y-2">
      {grid.map((dayCells, di) => {
        const day = DAYS_AR[di];
        const hasAny = dayCells.some((c) => c.status !== 'free');
        if (!hasAny) return null;
        return (
          <div key={day} className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
            <p className="text-xs font-bold text-gold-400/90 mb-2">{day}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {dayCells.map((cell) => (
                <WeeklyGridCellView key={`${day}_${cell.period}`} cell={cell} showTeacher={showTeacher} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GridLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#A3AED0] mb-3">
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-sm bg-[#01B574]/40 border border-[#01B574]/40" /> مُدخلة
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/25 border border-dashed border-amber-500/40" /> فارغة (اضغط لمعرفة المعلم)
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-sm bg-white/[0.03] border border-dashed border-white/[0.1]" /> لا حصة
      </span>
    </div>
  );
}

type WeeklyPlanMonitorViewProps = {
  entries: AcademicWeeklyPlanEntry[];
  scheduleSlots?: ClassScheduleSlot[];
  showTeacher?: boolean;
  className?: string;
};

/** جدول أسبوعي كامل مع الحصص الفارغة — للمدير/الوكيل وصفحة التصدير */
export function WeeklyPlanMonitorView({
  entries,
  scheduleSlots,
  showTeacher = true,
  className,
}: WeeklyPlanMonitorViewProps) {
  const grid = useMemo(() => {
    if (!scheduleSlots?.length) return null;
    return buildWeeklyGrid(entries, scheduleSlots);
  }, [entries, scheduleSlots]);

  const stats = useMemo(() => (grid ? computeWeeklyGridStats(grid) : null), [grid]);

  if (!grid) {
    return (
      <p className={clsx('text-sm text-[#A3AED0] italic', className)}>
        لا يوجد جدول دراسي مسجّل لهذا الفصل — أضف جداول المعلمين أولاً
      </p>
    );
  }

  return (
    <div className={className}>
      {stats && stats.pending > 0 && (
        <p className="text-xs text-amber-300 font-medium mb-2 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {stats.pending} حصة مجدولة لم يُدخل موضوعها بعد
        </p>
      )}
      <GridLegend />
      <FullWeeklyGrid grid={grid} showTeacher={showTeacher} />
    </div>
  );
}

export { computeWeeklyGridStats as getWeeklyGridStats };
