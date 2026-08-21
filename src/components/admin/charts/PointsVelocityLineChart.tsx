import { ResponsiveLine } from '@nivo/line';
import { adminChartTheme, CHART_COLORS } from './adminChartTheme';
import type { DailyPoint } from '../../../lib/pointsAnalytics';

type Props = {
  thisWeek: DailyPoint[];
  lastWeek: DailyPoint[];
  height?: number;
};

export function PointsVelocityLineChart({ thisWeek, lastWeek, height = 220 }: Props) {
  const series = [
    {
      id: 'هذا الأسبوع',
      color: CHART_COLORS.gold,
      data: thisWeek.map((d) => ({ x: d.label, y: d.points })),
    },
    {
      id: 'الأسبوع السابق',
      color: CHART_COLORS.blue,
      data: lastWeek.map((d) => ({ x: d.label, y: d.points })),
    },
  ];

  return (
    <div style={{ height }} dir="ltr">
      <ResponsiveLine
        data={series}
        theme={adminChartTheme}
        margin={{ top: 16, right: 24, bottom: 40, left: 48 }}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', min: 0, stacked: false }}
        curve="monotoneX"
        axisTop={null}
        axisRight={null}
        axisBottom={{ tickSize: 0, tickPadding: 8 }}
        axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 5 }}
        enableGridX={false}
        enablePoints
        pointSize={8}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointColor="#111c44"
        useMesh
        enableArea
        areaOpacity={0.08}
        legends={[
          {
            anchor: 'top-right',
            direction: 'row',
            translateY: -8,
            itemWidth: 100,
            itemHeight: 16,
            symbolSize: 10,
            symbolShape: 'circle',
          },
        ]}
        animate
        motionConfig="gentle"
        tooltip={({ point }) => (
          <div className="text-sm">
            <strong>{point.seriesId}</strong> — {String(point.data.x)}
            <br />
            <strong>{point.data.y}</strong> نقطة
          </div>
        )}
        role="img"
        ariaLabel="مخطط سرعة منح النقاط"
      />
    </div>
  );
}
