import { ResponsiveBar } from '@nivo/bar';
import { adminChartTheme, CHART_COLORS } from './adminChartTheme';
import type { DailyPoint } from '../../../lib/pointsAnalytics';

type Props = {
  data: DailyPoint[];
  compareData?: DailyPoint[];
  height?: number;
};

export function DailyPointsBarChart({ data, compareData, height = 260 }: Props) {
  const chartData = data.map((d, i) => ({
    day: d.label,
    هذا_الأسبوع: d.points,
  }));

  const keys = compareData ? ['هذا_الأسبوع', 'الأسبوع_السابق'] : ['هذا_الأسبوع'];

  const fullData = compareData
    ? data.map((d, i) => ({
        day: d.label,
        هذا_الأسبوع: d.points,
        الأسبوع_السابق: compareData[i]?.points ?? 0,
      }))
    : chartData;

  return (
    <div style={{ height }} dir="ltr">
      <ResponsiveBar
        data={fullData}
        keys={keys}
        indexBy="day"
        margin={{ top: 16, right: 16, bottom: 40, left: 48 }}
        padding={0.35}
        groupMode="grouped"
        colors={[CHART_COLORS.gold, CHART_COLORS.blueDim]}
        theme={adminChartTheme}
        borderRadius={6}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          tickValues: 5,
        }}
        enableLabel={false}
        enableGridY
        animate
        motionConfig="gentle"
        tooltip={({ id, value, indexValue }) => (
          <div className="text-sm">
            <strong>{indexValue}</strong>
            <br />
            {id}: <strong>{value}</strong> نقطة
          </div>
        )}
        role="img"
        ariaLabel="رسم بياني لمنح النقاط اليومي"
      />
    </div>
  );
}
