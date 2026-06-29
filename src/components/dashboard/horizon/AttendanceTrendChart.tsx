import { useMemo } from 'react';
import { CalendarCheck } from 'lucide-react';
import { HorizonCard } from './HorizonDashboard';

type DayRow = { date: string; rate: number };

type AttendanceTrendChartProps = {
  data: DayRow[];
  averageRate?: string;
};

function formatDayLabel(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T12:00:00');
    return d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return isoDate;
  }
}

function rateColor(rate: number): string {
  if (rate >= 90) return 'linear-gradient(180deg, #34d399 0%, #01B574 100%)';
  if (rate >= 75) return 'linear-gradient(180deg, #fbbf24 0%, #f0b429 100%)';
  return 'linear-gradient(180deg, #f87171 0%, #EE5D50 100%)';
}

export function AttendanceTrendChart({ data, averageRate }: AttendanceTrendChartProps) {
  const ordered = useMemo(
    () => [...data].sort((a, b) => a.date.localeCompare(b.date)),
    [data]
  );

  if (ordered.length === 0) {
    return (
      <HorizonCard>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-[#01B574]" />
          معدلات الحضور اليومي
        </h3>
        <div className="text-center py-14 rounded-[16px] bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[#A3AED0] text-sm">لا توجد سجلات حضور كافية للعرض</p>
        </div>
      </HorizonCard>
    );
  }

  return (
    <HorizonCard>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-[#01B574]" />
            معدلات الحضور اليومي
          </h3>
          <p className="text-sm font-medium text-[#A3AED0] mt-1">آخر {ordered.length} أيام مسجّلة</p>
        </div>
        {averageRate && (
          <div className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-[#A3AED0] uppercase tracking-wide">المتوسط</p>
            <p className="text-xl font-bold text-[#01B574] tabular-nums">{averageRate}</p>
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-2 sm:gap-3 h-[200px] px-1">
        {ordered.map((day) => {
          const heightPct = Math.max(8, day.rate);
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-2 min-w-0 group">
              <span className="text-xs font-bold text-white tabular-nums opacity-90 group-hover:text-[#01B574] transition-colors">
                {day.rate}%
              </span>
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-[10px] transition-all duration-500 ease-out group-hover:brightness-110 min-h-[6px]"
                  style={{
                    height: `${heightPct}%`,
                    background: rateColor(day.rate),
                    boxShadow: '0 -4px 16px rgba(1,181,116,0.15)',
                  }}
                />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-[#A3AED0] text-center leading-tight truncate w-full">
                {formatDayLabel(day.date)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap gap-4 justify-center text-xs text-[#A3AED0]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#01B574]" />
          ممتاز (90%+)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f0b429]" />
          جيد (75–89%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EE5D50]" />
          يحتاج متابعة (&lt;75%)
        </span>
      </div>
    </HorizonCard>
  );
}
