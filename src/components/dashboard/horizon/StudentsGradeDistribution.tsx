import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { HorizonCard } from './HorizonDashboard';

const BAR_GRADIENTS = [
  'linear-gradient(270deg, #7551FF 0%, #422AFB 100%)',
  'linear-gradient(270deg, #4481EB 0%, #04BEFE 100%)',
  'linear-gradient(270deg, #f0b429 0%, #d4a017 100%)',
  'linear-gradient(270deg, #01B574 0%, #059669 100%)',
  'linear-gradient(270deg, #EE5D50 0%, #dc2626 100%)',
  'linear-gradient(270deg, #a78bfa 0%, #7c3aed 100%)',
];

const DONUT_COLORS = ['#7551FF', '#4481EB', '#f0b429', '#01B574', '#EE5D50', '#a78bfa'];

type GradeRow = { name: string; count: number };

type StudentsGradeDistributionProps = {
  data: GradeRow[];
};

function buildDonutGradient(rows: GradeRow[], total: number): string {
  if (total === 0 || rows.length === 0) return '#1B254B';

  let cursor = 0;
  const stops = rows.map((row, index) => {
    const share = (row.count / total) * 100;
    const start = cursor;
    cursor += share;
    const color = DONUT_COLORS[index % DONUT_COLORS.length];
    return `${color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });

  return `conic-gradient(from -90deg, ${stops.join(', ')})`;
}

export function StudentsGradeDistribution({ data }: StudentsGradeDistributionProps) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.count - a.count),
    [data]
  );

  const total = useMemo(() => sorted.reduce((sum, row) => sum + row.count, 0), [sorted]);
  const maxCount = sorted[0]?.count ?? 1;
  const donutGradient = useMemo(() => buildDonutGradient(sorted, total), [sorted, total]);
  const topGrade = sorted[0];

  if (sorted.length === 0) {
    return (
      <HorizonCard>
        <div className="text-center py-14 rounded-[16px] bg-white/[0.03] border border-white/[0.06]">
          <Users className="w-10 h-10 text-[#A3AED0]/40 mx-auto mb-3" />
          <p className="text-[#A3AED0] text-sm">لا توجد بيانات طلاب لعرض التوزيع</p>
        </div>
      </HorizonCard>
    );
  }

  return (
    <HorizonCard>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">توزيع الطلاب حسب الصف</h3>
          <p className="text-sm font-medium text-[#A3AED0] mt-1">مقارنة أعداد الطلاب بين الصفوف</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-[#A3AED0] uppercase tracking-wide">الإجمالي</p>
            <p className="text-xl font-bold text-white tabular-nums">{total}</p>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-[#A3AED0] uppercase tracking-wide">الصفوف</p>
            <p className="text-xl font-bold text-[#f0b429] tabular-nums">{sorted.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-[180px] h-[180px]">
            <div
              className="absolute inset-0 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
              style={{ background: donutGradient }}
            />
            <div className="absolute inset-[22%] rounded-full bg-[#111c44] border border-white/[0.08] flex flex-col items-center justify-center text-center px-2">
              <p className="text-[10px] font-semibold text-[#A3AED0]">إجمالي الطلاب</p>
              <p className="text-2xl font-bold text-white tabular-nums mt-0.5">{total}</p>
              {topGrade && (
                <p className="text-[10px] text-[#f0b429] mt-1 truncate max-w-full">
                  الأكثر: {topGrade.name}
                </p>
              )}
            </div>
          </div>

          <div className="w-full space-y-2">
            {sorted.slice(0, 5).map((row, index) => {
              const sharePct = total > 0 ? Math.round((row.count / total) * 100) : 0;
              return (
                <div key={row.name} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                    />
                    <span className="text-[#A3AED0] truncate">{row.name}</span>
                  </div>
                  <span className="text-white font-semibold tabular-nums shrink-0">{sharePct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3.5">
          {sorted.map((row, index) => {
            const widthPct = Math.max(6, Math.round((row.count / maxCount) * 100));
            const sharePct = total > 0 ? Math.round((row.count / total) * 100) : 0;

            return (
              <div key={row.name} className="group">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-bold text-[#A3AED0]/70 tabular-nums w-5 text-center shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-white truncate">{row.name}</span>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-xs font-medium text-[#A3AED0]">{sharePct}%</span>
                    <span className="text-sm font-bold text-white tabular-nums min-w-[2rem] text-left">
                      {row.count}
                    </span>
                  </div>
                </div>
                <div className="relative h-9 rounded-[12px] bg-[#0b1437]/90 border border-white/[0.05] overflow-hidden">
                  <div
                    className="absolute inset-y-0 right-0 rounded-[10px] transition-all duration-700 ease-out group-hover:brightness-110"
                    style={{
                      width: `${widthPct}%`,
                      background: BAR_GRADIENTS[index % BAR_GRADIENTS.length],
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </HorizonCard>
  );
}
