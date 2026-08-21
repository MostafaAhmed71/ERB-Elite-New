import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { GlassCard } from './GlassShell';

const AXIS_COLORS = ['#7551ff', '#4481eb', '#01b574', '#f0b429', '#ee5d90', '#04befe'];

type AreaPoint = { label: string; value: number };

type GlassAreaChartCardProps = {
  title: string;
  subtitle?: string;
  data: AreaPoint[];
};

export function GlassAreaChartCard({ title, subtitle, data }: GlassAreaChartCardProps) {
  return (
    <GlassCard glow className="h-full min-h-[280px] flex flex-col">
      <div className="mb-3 flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white font-cairo">{title}</h3>
          {subtitle && <p className="text-xs text-[#A3AED0] mt-0.5 font-cairo">{subtitle}</p>}
        </div>
        <span className="glass-pill !py-1 !text-[11px] !text-[#f0b429]">يومي</span>
      </div>
      <div className="flex-1 min-h-[200px] w-full">
        {data.length === 0 ? (
          <p className="text-sm text-[#A3AED0] py-12 text-center">لا توجد بيانات بعد</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="glass-area-fill-brand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7551ff" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#7551ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#A3AED0', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#A3AED0', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(17, 28, 68, 0.96)',
                  border: '1px solid rgba(230,170,50,0.25)',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 12,
                  fontFamily: 'Cairo, sans-serif',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#7551ff"
                strokeWidth={2.5}
                fill="url(#glass-area-fill-brand)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </GlassCard>
  );
}

type DonutSlice = { name: string; value: number };

type GlassDonutCardProps = {
  title: string;
  subtitle?: string;
  data: DonutSlice[];
  centerLabel?: string;
  centerValue?: string | number;
};

export function GlassDonutCard({
  title,
  subtitle,
  data,
  centerLabel = 'الإجمالي',
  centerValue,
}: GlassDonutCardProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const display = centerValue ?? total;

  return (
    <GlassCard className="h-full min-h-[280px] flex flex-col">
      <div className="mb-3">
        <h3 className="text-sm sm:text-base font-bold text-white font-cairo">{title}</h3>
        {subtitle && <p className="text-xs text-[#A3AED0] mt-0.5 font-cairo">{subtitle}</p>}
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
        <div className="relative w-full max-w-[190px] aspect-square mx-auto sm:mx-0">
          {total === 0 ? (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-[#A3AED0]">
              لا بيانات
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="64%"
                    outerRadius="88%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={AXIS_COLORS[i % AXIS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(17, 28, 68, 0.96)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      fontSize: 12,
                      color: '#fff',
                      fontFamily: 'Cairo, sans-serif',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[10px] text-[#A3AED0] font-medium">{centerLabel}</p>
                <p className="text-xl font-bold text-white tabular-nums font-cairo">{display}</p>
              </div>
            </>
          )}
        </div>
        <ul className="flex-1 w-full space-y-2.5 min-w-0">
          {data.map((slice, i) => {
            const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
            return (
              <li key={slice.name} className="flex items-center gap-2 text-xs font-cairo">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: AXIS_COLORS[i % AXIS_COLORS.length] }}
                />
                <span className="text-[#A3AED0] truncate flex-1 font-medium">{slice.name}</span>
                <span className="font-bold text-white tabular-nums">{pct}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </GlassCard>
  );
}
