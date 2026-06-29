import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Radar as RadarIcon } from 'lucide-react';
import type { ClassAxisRow } from '../../lib/classReport';
import { averagePerStudent } from '../../lib/classReport';
import {
  AXIS_CHART_COLORS,
  AnalyticsLegend,
  AnalyticsPanel,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
} from './AnalyticsPrimitives';

const AXIS_LABELS = {
  activity: 'النشاط',
  behavior: 'السلوك',
  achievement: 'الإنجاز',
  initiative: 'المبادرة',
};

type WeightedBarProps = {
  rows: ClassAxisRow[];
  limit?: number;
};

export function ClassWeightedBarChart({ rows, limit = 10 }: WeightedBarProps) {
  const chartData = useMemo(() => {
    return [...rows]
      .sort((a, b) => averagePerStudent(b, 'weighted') - averagePerStudent(a, 'weighted'))
      .slice(0, limit)
      .map((r) => ({
        key: r.key,
        label: `${r.class_name}`,
        grade: r.grade,
        weighted: averagePerStudent(r, 'weighted'),
        students: r.studentCount,
      }));
  }, [rows, limit]);

  const schoolAvg =
    rows.length > 0
      ? Math.round(
          rows.reduce((sum, r) => sum + averagePerStudent(r, 'weighted'), 0) / rows.length
        )
      : 0;

  const barColors = ['#f0b429', '#4481EB', '#01B574', '#9F7AEA', '#04BEFE', '#EE5D50'];

  return (
    <AnalyticsPanel
      title="ترتيب الفصول — النقاط الموزونة"
      subtitle={`متوسط موزون لكل طالب · خط مرجعي = ${schoolAvg}`}
      icon={BarChart3}
    >
      <div className="mb-3">
        <AnalyticsLegend
          items={[
            { color: AXIS_CHART_COLORS.weighted, label: 'متوسط موزون' },
            { color: 'rgba(255,255,255,0.35)', label: 'متوسط المدرسة' },
          ]}
        />
      </div>
      <div className="h-[320px]" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
            <XAxis type="number" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={72}
              tick={CHART_AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(v: number) => [`${v} نقطة`, 'متوسط موزون']}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as { grade: string; label: string; students: number };
                return row ? `${row.grade} — فصل ${row.label} · ${row.students} طالب` : '';
              }}
            />
            <ReferenceLine x={schoolAvg} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" />
            <Bar dataKey="weighted" radius={[0, 8, 8, 0]} maxBarSize={22} animationDuration={700}>
              {chartData.map((row, i) => (
                <Cell key={row.key} fill={barColors[i % barColors.length]} />
              ))}
              <LabelList
                dataKey="weighted"
                position="right"
                fill="rgba(255,255,255,0.85)"
                fontSize={11}
                fontWeight={700}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsPanel>
  );
}

type AxisStackProps = { rows: ClassAxisRow[]; limit?: number };

export function ClassAxisStackChart({ rows, limit = 8 }: AxisStackProps) {
  const chartData = useMemo(
    () =>
      [...rows]
        .sort((a, b) => averagePerStudent(b, 'weighted') - averagePerStudent(a, 'weighted'))
        .slice(0, limit)
        .map((r) => ({
          name: r.class_name,
          نشاط: averagePerStudent(r, 'activity'),
          سلوك: averagePerStudent(r, 'behavior'),
          إنجاز: averagePerStudent(r, 'achievement'),
          مبادرة: averagePerStudent(r, 'initiative'),
        })),
    [rows, limit]
  );

  return (
    <AnalyticsPanel
      title="مقارنة المحاور بين الفصول"
      subtitle="متوسط كل محور تميز لكل فصل"
      icon={BarChart3}
    >
      <div className="mb-3">
        <AnalyticsLegend
          items={[
            { color: AXIS_CHART_COLORS.activity, label: AXIS_LABELS.activity },
            { color: AXIS_CHART_COLORS.behavior, label: AXIS_LABELS.behavior },
            { color: AXIS_CHART_COLORS.achievement, label: AXIS_LABELS.achievement },
            { color: AXIS_CHART_COLORS.initiative, label: AXIS_LABELS.initiative },
          ]}
        />
      </div>
      <div className="h-[300px]" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={36} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Bar dataKey="نشاط" fill={AXIS_CHART_COLORS.activity} radius={[4, 4, 0, 0]} />
            <Bar dataKey="سلوك" fill={AXIS_CHART_COLORS.behavior} radius={[4, 4, 0, 0]} />
            <Bar dataKey="إنجاز" fill={AXIS_CHART_COLORS.achievement} radius={[4, 4, 0, 0]} />
            <Bar dataKey="مبادرة" fill={AXIS_CHART_COLORS.initiative} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsPanel>
  );
}

type RadarProps = {
  rows: ClassAxisRow[];
};

export function SchoolAxisRadarChart({ rows }: RadarProps) {
  const radarData = useMemo(() => {
    if (rows.length === 0) return [];
    const totals = rows.reduce(
      (acc, r) => ({
        activity: acc.activity + averagePerStudent(r, 'activity'),
        behavior: acc.behavior + averagePerStudent(r, 'behavior'),
        achievement: acc.achievement + averagePerStudent(r, 'achievement'),
        initiative: acc.initiative + averagePerStudent(r, 'initiative'),
      }),
      { activity: 0, behavior: 0, achievement: 0, initiative: 0 }
    );
    const n = rows.length;
    return [
      { axis: AXIS_LABELS.activity, value: Math.round(totals.activity / n), fullMark: 100 },
      { axis: AXIS_LABELS.behavior, value: Math.round(totals.behavior / n), fullMark: 100 },
      { axis: AXIS_LABELS.achievement, value: Math.round(totals.achievement / n), fullMark: 100 },
      { axis: AXIS_LABELS.initiative, value: Math.round(totals.initiative / n), fullMark: 100 },
    ];
  }, [rows]);

  return (
    <AnalyticsPanel
      title="بصمة المدرسة — المحاور الأربعة"
      subtitle="متوسط جميع الفصول على مستوى كل محور"
      icon={RadarIcon}
    >
      <div className="h-[300px]" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
            <Radar
              dataKey="value"
              stroke={AXIS_CHART_COLORS.weighted}
              fill={AXIS_CHART_COLORS.weighted}
              fillOpacity={0.28}
              strokeWidth={2}
            />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v}`, 'متوسط']} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsPanel>
  );
}
