import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, CalendarRange } from 'lucide-react';
import clsx from 'clsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { fetchApprovedClassGrants } from '../../lib/classPoints';
import { fetchAcademicTerms, termRangeToBounds } from '../../lib/academicTerms';
import { buildTermClassComparison, summarizeTermComparison } from '../../lib/termComparison';
import { TapHandLoader } from '../ui/TapHandLoader';

type Props = {
  gradeFilter?: string;
};

export function TermComparisonPanel({ gradeFilter = '' }: Props) {
  const { data: terms } = useQuery({
    queryKey: ['academic-terms-config'],
    queryFn: fetchAcademicTerms,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['term-class-comparison'],
    queryFn: async () => {
      const [ledgerRes, classGrants, termsConfig] = await Promise.all([
        supabase
          .from('points_ledger')
          .select(`
            student_id, points, status, activity_id, created_at,
            activities (category),
            students:student_id (grade, class_name, full_name)
          `)
          .eq('status', 'approved'),
        fetchApprovedClassGrants(),
        fetchAcademicTerms(),
      ]);
      if (ledgerRes.error) throw ledgerRes.error;

      const t1 = termRangeToBounds(termsConfig.term1);
      const t2 = termRangeToBounds(termsConfig.term2);

      const rows = buildTermClassComparison(
        (ledgerRes.data ?? []) as unknown as Parameters<typeof buildTermClassComparison>[0],
        classGrants,
        t1.from,
        t1.to,
        t2.from,
        t2.to,
      );

      return { rows, termsConfig };
    },
  });

  const filtered = useMemo(() => {
    if (!data?.rows) return [];
    if (!gradeFilter) return data.rows;
    return data.rows.filter((r) => r.grade === gradeFilter);
  }, [data?.rows, gradeFilter]);

  const summary = useMemo(
    () => (filtered.length > 0 ? summarizeTermComparison(filtered) : null),
    [filtered],
  );

  const chartData = filtered.slice(0, 10).map((r) => ({
    name: r.class_name,
    [data?.termsConfig.term1.label ?? 'ف1']: r.term1Weighted,
    [data?.termsConfig.term2.label ?? 'ف2']: r.term2Weighted,
  }));

  if (isLoading) return <TapHandLoader label="جاري تحميل مقارنة الفصول..." />;

  if (!data || filtered.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-white/40 text-sm" dir="rtl">
        لا توجد بيانات كافية لمقارنة الفصول الدراسية بعد
      </div>
    );
  }

  return (
    <div className="glass-card p-5 space-y-4 border border-cyan-500/15" dir="rtl">
      <div className="flex items-start gap-3">
        <CalendarRange className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-white font-semibold text-sm">مقارنة الفصول — P4</h3>
          <p className="text-white/40 text-xs mt-1">
            {data.termsConfig.term1.label} ({data.termsConfig.term1.start} → {data.termsConfig.term1.end})
            {' · '}
            {data.termsConfig.term2.label} ({data.termsConfig.term2.start} → {data.termsConfig.term2.end})
          </p>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-emerald-300 font-bold text-lg">{summary.improved}</p>
            <p className="text-white/40 text-[10px]">فصل تحسّن</p>
          </div>
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-300 font-bold text-lg">{summary.declined}</p>
            <p className="text-white/40 text-[10px]">فصل انخفض</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white font-bold text-lg">{summary.stable}</p>
            <p className="text-white/40 text-[10px]">بدون تغيير</p>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filtered.map((r) => (
          <div
            key={r.key}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/3 border border-white/5"
          >
            <div>
              <p className="text-white text-sm font-medium">{r.label}</p>
              <p className="text-white/40 text-[10px] mt-0.5">
                ف1: {r.term1Weighted} · ف2: {r.term2Weighted}
              </p>
            </div>
            <span
              className={clsx(
                'flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-full border',
                r.trend === 'up' && 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
                r.trend === 'down' && 'text-red-300 bg-red-500/10 border-red-500/20',
                r.trend === 'flat' && 'text-white/40 bg-white/5 border-white/10',
              )}
            >
              {r.trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {r.trend === 'down' && <TrendingDown className="w-3 h-3" />}
              {r.trend === 'flat' && <Minus className="w-3 h-3" />}
              {r.delta > 0 ? `+${r.delta}` : r.delta}
            </span>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="h-48 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#0f1729',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar
                dataKey={data.termsConfig.term1.label}
                fill="rgba(255,255,255,0.3)"
                radius={[4, 4, 0, 0]}
              />
              <Bar dataKey={data.termsConfig.term2.label} fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
