import { useMemo } from 'react';
import { BarChart3, TrendingUp, Award, Users } from 'lucide-react';
import type { ClassScoreStats, GradeBucket } from '../../../lib/examAnalytics';
import clsx from 'clsx';

type Props = {
  distribution: GradeBucket[];
  stats: ClassScoreStats | null;
  classAvg: number | null;
  gradeLabel: string;
  classLabel: string;
};

function buildDonutGradient(buckets: GradeBucket[], total: number): string {
  if (total === 0) return '#1B254B';
  let cursor = 0;
  const stops = buckets.map((b) => {
    const share = (b.count / total) * 100;
    const start = cursor;
    cursor += share;
    return `${b.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });
  return `conic-gradient(from -90deg, ${stops.join(', ')})`;
}

export function ClassGradeDistributionChart({
  distribution,
  stats,
  classAvg,
  gradeLabel,
  classLabel,
}: Props) {
  const total = useMemo(() => distribution.reduce((s, b) => s + b.count, 0), [distribution]);
  const maxCount = useMemo(() => Math.max(...distribution.map((b) => b.count), 1), [distribution]);
  const donutGradient = useMemo(() => buildDonutGradient(distribution, total), [distribution, total]);
  const dominant = useMemo(
    () => [...distribution].sort((a, b) => b.count - a.count).find((b) => b.count > 0),
    [distribution]
  );

  if (total === 0) {
    return (
      <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-10 text-center">
        <BarChart3 className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">لا توجد درجات كافية لعرض التوزيع</p>
      </div>
    );
  }

  return (
    <div className="bg-navy-900/50 border border-white/8 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gold-400" />
            توزيع درجات الفصل
          </h2>
          <p className="text-white/40 text-xs mt-1">
            {gradeLabel} — فصل {classLabel} · متوسط الأداء {classAvg ?? '—'}%
          </p>
        </div>
        {stats && (
          <div className="flex flex-wrap gap-2">
            <StatPill icon={TrendingUp} label="الوسيط" value={`${stats.median}%`} />
            <StatPill icon={Users} label="النجاح ≥60%" value={`${stats.passRate}%`} accent="cyan" />
            <StatPill icon={Award} label="التميز ≥80%" value={`${stats.excellenceRate}%`} accent="emerald" />
          </div>
        )}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-[168px] h-[168px]">
            <div
              className="absolute inset-0 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
              style={{ background: donutGradient }}
            />
            <div className="absolute inset-[24%] rounded-full bg-[#111c44] border border-white/10 flex flex-col items-center justify-center text-center px-2">
              <p className="text-[10px] font-medium text-white/50">إجمالي الطلاب</p>
              <p className="text-2xl font-bold text-white tabular-nums">{total}</p>
              {dominant && (
                <p className="text-[10px] mt-1 truncate max-w-full" style={{ color: dominant.color }}>
                  الأكثر: {dominant.level}
                </p>
              )}
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-2">
            {distribution.map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                <span className="text-white/50 truncate">{b.level}</span>
                <span className="mr-auto font-semibold text-white tabular-nums">{b.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {distribution.map((bucket) => {
            const sharePct = total > 0 ? Math.round((bucket.count / total) * 100) : 0;
            const widthPct = Math.max(bucket.count > 0 ? 8 : 0, Math.round((bucket.count / maxCount) * 100));

            return (
              <div key={bucket.label} className="group">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border"
                      style={{
                        color: bucket.color,
                        borderColor: `${bucket.color}40`,
                        backgroundColor: `${bucket.color}15`,
                      }}
                    >
                      {bucket.level}
                    </span>
                    <span className="text-sm text-white/70">{bucket.label}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 tabular-nums">
                    <span className="text-xs text-white/40">{sharePct}%</span>
                    <span className="text-sm font-bold text-white min-w-[1.5rem] text-left">{bucket.count}</span>
                  </div>
                </div>
                <div className="relative h-10 rounded-xl bg-[#0b1437]/80 border border-white/[0.06] overflow-hidden">
                  <div
                    className="absolute inset-y-0 right-0 rounded-[10px] transition-all duration-700 ease-out group-hover:brightness-110"
                    style={{
                      width: `${widthPct}%`,
                      background: `linear-gradient(270deg, ${bucket.color} 0%, ${bucket.color}99 100%)`,
                      boxShadow: `0 0 20px ${bucket.color}33, inset 0 1px 0 rgba(255,255,255,0.2)`,
                    }}
                  />
                  {bucket.count > 0 && widthPct > 18 && (
                    <span className="absolute inset-y-0 right-3 flex items-center text-[11px] font-bold text-white/90 drop-shadow">
                      {sharePct}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {stats && (
        <div className="px-5 py-3 border-t border-white/5 bg-white/[0.02] flex flex-wrap gap-4 text-xs text-white/45">
          <span>الأدنى: <strong className="text-white/80">{stats.min}%</strong></span>
          <span>الأعلى: <strong className="text-white/80">{stats.max}%</strong></span>
          <span>المدى: <strong className="text-white/80">{stats.max - stats.min}%</strong></span>
        </div>
      )}
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  accent = 'gold',
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  accent?: 'gold' | 'cyan' | 'emerald';
}) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs',
        accent === 'gold' && 'bg-gold-500/10 border-gold-400/20 text-gold-300',
        accent === 'cyan' && 'bg-cyan-500/10 border-cyan-400/20 text-cyan-300',
        accent === 'emerald' && 'bg-emerald-500/10 border-emerald-400/20 text-emerald-300'
      )}
    >
      <Icon className="w-3.5 h-3.5 opacity-80" />
      <span className="text-white/50">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}
