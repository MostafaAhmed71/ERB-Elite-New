import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { School, Users } from 'lucide-react';
import type { ClassBulkRankEntry } from '../../lib/classPoints';
import {
  AXIS_CHART_COLORS,
  AnalyticsPanel,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
} from './AnalyticsPrimitives';

const BAR_PALETTE = ['#f0b429', '#94a3b8', '#b45309', '#4481EB', '#01B574', '#9F7AEA', '#04BEFE', '#EE5D50'];

type ClassBulkChartProps = {
  entries: ClassBulkRankEntry[];
  limit?: number;
};

export function ClassBulkPointsChart({ entries, limit = 10 }: ClassBulkChartProps) {
  const data = useMemo(
    () =>
      entries.slice(0, limit).map((e) => ({
        key: e.key,
        name: e.class_name,
        grade: e.grade,
        points: e.totalPoints,
        grants: e.grantCount,
      })),
    [entries, limit]
  );

  return (
    <AnalyticsPanel
      title="رسم المنح الجماعية للفصول"
      subtitle="إجمالي نقاط المنح الجماعي المعتمدة — وليس نقاط الطلاب الفردية"
      icon={School}
    >
      <div className="h-[300px]" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
            <XAxis type="number" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={68}
              tick={CHART_AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(v: number) => [`${v.toLocaleString('ar-SA')} نقطة`, 'منح جماعي']}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as { grade: string; grants: number };
                return row ? `${row.grade} · ${row.grants} منحة` : '';
              }}
            />
            <Bar dataKey="points" radius={[0, 8, 8, 0]} maxBarSize={20} animationDuration={700}>
              {data.map((row, i) => (
                <Cell key={row.key} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />
              ))}
              <LabelList dataKey="points" position="right" fill="rgba(255,255,255,0.85)" fontSize={11} fontWeight={700} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsPanel>
  );
}

type StudentChartEntry = {
  student_id: string;
  full_name: string;
  grade: string;
  class_name: string;
  total_points: number;
  rank: number;
};

type StudentTopChartProps = {
  students: StudentChartEntry[];
  limit?: number;
};

export function StudentTopChart({ students, limit = 12 }: StudentTopChartProps) {
  const data = useMemo(
    () =>
      students.slice(0, limit).map((s) => ({
        id: s.student_id,
        name: s.full_name.length > 14 ? `${s.full_name.slice(0, 12)}…` : s.full_name,
        fullName: s.full_name,
        points: s.total_points,
        rank: s.rank,
        classLabel: `${s.grade} · ${s.class_name}`,
      })),
    [students, limit]
  );

  return (
    <AnalyticsPanel
      title="أعلى الطلاب نقاطاً"
      subtitle="أفضل الطلاب حسب مجموع النقاط المعتمدة أو المحور المختار"
      icon={Users}
    >
      <div className="h-[300px]" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
            <XAxis type="number" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={88}
              tick={CHART_AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(v: number) => [`${v.toLocaleString('ar-SA')}`, 'نقطة']}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as { fullName: string; classLabel: string; rank: number };
                return row ? `#${row.rank} ${row.fullName} — ${row.classLabel}` : '';
              }}
            />
            <Bar dataKey="points" radius={[0, 8, 8, 0]} maxBarSize={18} animationDuration={700}>
              {data.map((row, i) => (
                <Cell
                  key={row.id}
                  fill={row.rank <= 3 ? BAR_PALETTE[row.rank - 1] : AXIS_CHART_COLORS.bulk}
                />
              ))}
              <LabelList dataKey="points" position="right" fill="rgba(255,255,255,0.85)" fontSize={11} fontWeight={700} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsPanel>
  );
}
