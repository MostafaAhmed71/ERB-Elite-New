import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import clsx from 'clsx';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DEFAULT_CLASSES, MIDDLE_SCHOOL_GRADES } from '../../../lib/schoolClasses';

export type ClassAttendanceStat = {
  key: string;
  label: string;
  grade: string;
  class_name: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  score: number;
  ratePct: number;
};

type Props = {
  classes: ClassAttendanceStat[];
  schoolRatePct: number;
};

type ChartRow = ClassAttendanceStat & {
  shortLabel: string;
  fill: string;
};

function rateColor(rate: number): string {
  if (rate >= 90) return '#01B574';
  if (rate >= 75) return '#f0b429';
  return '#EE5D50';
}

function rateLevel(rate: number): string {
  if (rate >= 90) return 'ممتاز';
  if (rate >= 75) return 'جيد';
  return 'متابعة';
}

function shortClassLabel(c: ClassAttendanceStat): string {
  const gradeShort = c.grade.replace(' المتوسط', '').replace('الصف ', '').trim();
  return `${gradeShort} · ${c.class_name}`;
}

function gradeSortIndex(grade: string): number {
  const idx = (MIDDLE_SCHOOL_GRADES as readonly string[]).indexOf(grade);
  return idx >= 0 ? idx : 100;
}

function classSortIndex(className: string): number {
  const idx = (DEFAULT_CLASSES as readonly string[]).indexOf(className);
  return idx >= 0 ? idx : 100;
}

function compareByGradeClass(a: ClassAttendanceStat, b: ClassAttendanceStat): number {
  const byGrade = gradeSortIndex(a.grade) - gradeSortIndex(b.grade);
  if (byGrade !== 0) return byGrade;
  if (gradeSortIndex(a.grade) >= 100 && gradeSortIndex(b.grade) >= 100) {
    const gradeCmp = a.grade.localeCompare(b.grade, 'ar');
    if (gradeCmp !== 0) return gradeCmp;
  }

  const byClass = classSortIndex(a.class_name) - classSortIndex(b.class_name);
  if (byClass !== 0) return byClass;
  return a.class_name.localeCompare(b.class_name, 'ar');
}

function CustomTooltip({
  active,
  payload,
  schoolRatePct,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
  schoolRatePct: number;
}) {
  if (!active || !payload?.[0]) return null;
  const row = payload[0].payload;
  const delta = row.ratePct - schoolRatePct;

  return (
    <div
      className="rounded-xl border border-gold-500/25 bg-[#111c44] px-4 py-3 shadow-xl text-xs"
      dir="rtl"
    >
      <p className="text-white font-semibold mb-2">{row.label}</p>
      <p className="text-gold-400 font-bold text-lg tabular-nums mb-2">
        {row.ratePct}% <span className="text-white/40 text-xs font-normal">نسبة الحضور</span>
      </p>
      <div className="space-y-1 text-white/60">
        <p>
          <span className="text-emerald-400">حاضر:</span> {row.present}
          <span className="mx-2 text-white/20">|</span>
          <span className="text-amber-400">متأخر:</span> {row.late}
          <span className="mx-2 text-white/20">|</span>
          <span className="text-red-400">غائب:</span> {row.absent}
        </p>
        <p>درجة الحضور: <strong className="text-white">{row.score}/100</strong></p>
        <p>
          {delta >= 0 ? '+' : ''}
          {delta}% عن متوسط المدرسة ({schoolRatePct}%)
        </p>
        <p className="text-white/40">المستوى: {rateLevel(row.ratePct)}</p>
      </div>
    </div>
  );
}

export function ClassAttendanceChart({ classes, schoolRatePct }: Props) {
  const chartData = useMemo<ChartRow[]>(
    () =>
      [...classes]
        .sort(compareByGradeClass)
        .map((c) => ({
          ...c,
          shortLabel: shortClassLabel(c),
          fill: rateColor(c.ratePct),
        })),
    [classes]
  );

  const best = useMemo(
    () => [...classes].sort((a, b) => b.ratePct - a.ratePct)[0],
    [classes]
  );
  const worst = useMemo(
    () => [...classes].sort((a, b) => a.ratePct - b.ratePct)[0],
    [classes]
  );
  const chartHeight = 360;
  const chartMinWidth = Math.max(520, chartData.length * 76);

  if (chartData.length === 0) {
    return (
      <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-10 text-center">
        <BarChart3 className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">لا توجد بيانات حضور للفصول في هذه الفترة</p>
      </div>
    );
  }

  return (
    <div className="bg-navy-900/50 border border-white/8 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gold-400" />
            نسبة الحضور حسب الفصل
          </h3>
          <p className="text-white/40 text-xs mt-1">
            {chartData.length} فصل · متوسط المدرسة {schoolRatePct}%
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {best && (
            <Pill label="الأعلى" value={`${best.class_name} (${best.ratePct}%)`} accent="emerald" />
          )}
          {worst && worst.key !== best?.key && (
            <Pill label="الأقل" value={`${worst.class_name} (${worst.ratePct}%)`} accent="red" />
          )}
        </div>
      </div>

      <div className="px-5 py-3 border-b border-white/5 flex flex-wrap gap-4 text-xs text-white/45">
        <Legend color="#01B574" label="ممتاز (90%+)" />
        <Legend color="#f0b429" label="جيد (75–89%)" />
        <Legend color="#EE5D50" label="متابعة (&lt;75%)" />
        <span className="mr-auto text-white/30">الخط المتقطع = متوسط المدرسة</span>
      </div>

      <div className="p-4 pt-2 overflow-x-auto" dir="ltr">
        <div style={{ minWidth: chartMinWidth, height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 28, right: 12, left: 0, bottom: 56 }}
              barCategoryGap="18%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis
                dataKey="shortLabel"
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
                interval={0}
                angle={-32}
                textAnchor="end"
                height={56}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip
                content={<CustomTooltip schoolRatePct={schoolRatePct} />}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <ReferenceLine
                y={schoolRatePct}
                stroke="rgba(255,255,255,0.35)"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                label={{
                  value: `متوسط ${schoolRatePct}%`,
                  position: 'insideTopRight',
                  fill: 'rgba(255,255,255,0.45)',
                  fontSize: 10,
                }}
              />
              <Bar dataKey="ratePct" radius={[8, 8, 0, 0]} maxBarSize={48} animationDuration={700}>
                {chartData.map((row) => (
                  <Cell key={row.key} fill={row.fill} />
                ))}
                <LabelList
                  dataKey="ratePct"
                  position="top"
                  formatter={(v: number) => `${v}%`}
                  fill="rgba(255,255,255,0.9)"
                  fontSize={11}
                  fontWeight={600}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function Pill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'emerald' | 'red';
}) {
  return (
    <div
      className={clsx(
        'px-3 py-1.5 rounded-xl border text-xs',
        accent === 'emerald'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          : 'bg-red-500/10 border-red-500/20 text-red-300'
      )}
    >
      <span className="text-white/40 ml-1">{label}:</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
