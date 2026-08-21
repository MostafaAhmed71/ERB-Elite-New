import { ResponsiveBar } from '@nivo/bar';
import { adminChartTheme, CHART_COLORS } from './adminChartTheme';
import type { AxisBreakdown } from '../../../lib/pointsAnalytics';

const AXIS_LABELS: Record<keyof AxisBreakdown, string> = {
  activity: 'النشاط',
  behavior: 'السلوك',
  achievement: 'الإنجاز',
  initiative: 'المبادرة',
};

const AXIS_COLORS = [
  CHART_COLORS.gold,
  CHART_COLORS.blue,
  CHART_COLORS.emerald,
  CHART_COLORS.purple,
];

type Props = {
  breakdown: AxisBreakdown;
  height?: number;
};

export function AxisBreakdownChart({ breakdown, height = 200 }: Props) {
  const data = (Object.keys(breakdown) as (keyof AxisBreakdown)[]).map((key) => ({
    axis: AXIS_LABELS[key],
    points: breakdown[key],
  }));

  return (
    <div style={{ height }} dir="ltr">
      <ResponsiveBar
        data={data}
        keys={['points']}
        indexBy="axis"
        margin={{ top: 8, right: 16, bottom: 40, left: 48 }}
        padding={0.45}
        colors={AXIS_COLORS}
        theme={adminChartTheme}
        borderRadius={8}
        axisTop={null}
        axisRight={null}
        axisBottom={{ tickSize: 0, tickPadding: 8 }}
        axisLeft={{ tickSize: 0, tickPadding: 8 }}
        enableLabel={false}
        enableGridY
        animate
        tooltip={({ indexValue, value }) => (
          <div className="text-sm">
            <strong>{indexValue}</strong>: {value} نقطة
          </div>
        )}
        role="img"
        ariaLabel="توزيع النقاط حسب المحاور"
      />
    </div>
  );
}
