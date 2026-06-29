import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../lib/supabase';
import { fetchApprovedClassGrants } from '../../lib/classPoints';
import { simulateWeightChange } from '../../lib/principalKpis';
import {
  DEFAULT_AXIS_WEIGHTS,
  fetchAxisWeights,
  normalizeWeights,
  type AxisWeights,
} from '../../lib/schoolConfig';
import { TapHandLoader } from '../ui/TapHandLoader';
import { Link } from 'react-router-dom';

const WEIGHT_SLIDERS = [
  { key: 'activity' as const, label: 'النشاط', color: 'text-blue-400' },
  { key: 'behavior' as const, label: 'السلوك', color: 'text-emerald-400' },
  { key: 'achievement' as const, label: 'الإنجاز', color: 'text-purple-400' },
  { key: 'initiative' as const, label: 'المبادرة', color: 'text-amber-400' },
  { key: 'attendance' as const, label: 'الحضور', color: 'text-cyan-400' },
];

export function WhatIfWeightsPanel() {
  const { data: currentWeights, isLoading: weightsLoading } = useQuery({
    queryKey: ['axis-weights'],
    queryFn: fetchAxisWeights,
  });

  const { data: ledger = [], isLoading: ledgerLoading } = useQuery({
    queryKey: ['what-if-ledger'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select(`
          student_id, points, status, activity_id, created_at,
          activities (category),
          students:student_id (grade, class_name)
        `)
        .eq('status', 'approved');
      if (error) throw error;
      return data ?? [];
    },
  });

  const [draftWeights, setDraftWeights] = useState<AxisWeights | null>(null);

  const weights = draftWeights ?? currentWeights ?? DEFAULT_AXIS_WEIGHTS;
  const weightSum = Math.round(
    (weights.activity + weights.behavior + weights.achievement + weights.initiative + weights.attendance) *
      100,
  );

  const simulation = useMemo(() => {
    if (ledger.length === 0) return [];
    return simulateWeightChange(
      ledger as unknown as Parameters<typeof simulateWeightChange>[0],
      normalizeWeights(weights),
    );
  }, [ledger, weights]);

  const rankChanges = useMemo(() => {
    const currentRank = new Map(
      [...simulation].sort((a, b) => b.current - a.current).map((r, i) => [r.class, i + 1]),
    );
    const simRank = new Map(simulation.map((r, i) => [r.class, i + 1]));
    return simulation.map((r) => ({
      ...r,
      currentRank: currentRank.get(r.class) ?? 0,
      simRank: simRank.get(r.class) ?? 0,
      rankDelta: (currentRank.get(r.class) ?? 0) - (simRank.get(r.class) ?? 0),
    }));
  }, [simulation]);

  if (weightsLoading || ledgerLoading) {
    return <TapHandLoader label="جاري تحميل محاكاة الأوزان..." />;
  }

  return (
    <HorizonCardWrapper>
      <div className="space-y-4" dir="rtl">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-violet-400" />
            <div>
              <h3 className="text-white font-semibold text-base">محاكاة What-If — P5</h3>
              <p className="text-white/40 text-xs mt-0.5">
                جرّب أوزاناً جديدة وشاهد تأثيرها على ترتيب الفصول قبل التطبيق
              </p>
            </div>
          </div>
          <Link
            to="/admin/settings"
            className="text-gold-400 text-xs hover:underline"
          >
            تطبيق الأوزان الفعلية → إعدادات البرنامج
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-white/60 text-xs font-medium">أوزان المحاكاة (لا تُحفظ تلقائياً)</p>
            {WEIGHT_SLIDERS.map(({ key, label, color }) => (
              <label key={key} className="block space-y-1">
                <div className="flex justify-between text-xs">
                  <span className={color}>{label}</span>
                  <span className="text-white/50 font-mono">{Math.round(weights[key] * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={60}
                  value={Math.round(weights[key] * 100)}
                  onChange={(e) =>
                    setDraftWeights((w) => ({
                      ...(w ?? currentWeights ?? DEFAULT_AXIS_WEIGHTS),
                      [key]: Number(e.target.value) / 100,
                    }))
                  }
                  className="w-full accent-violet-400"
                />
              </label>
            ))}
            <p className={clsx('text-xs font-mono', weightSum === 100 ? 'text-emerald-400' : 'text-amber-400')}>
              المجموع: {weightSum}% {weightSum !== 100 && '(يُطبَّع تلقائياً عند الحساب)'}
            </p>
            {draftWeights && (
              <button
                type="button"
                onClick={() => setDraftWeights(null)}
                className="text-white/40 text-xs hover:text-white"
              >
                إعادة للأوزان الحالية
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {rankChanges.length === 0 ? (
              <p className="text-white/30 text-sm">لا توجد بيانات فصول كافية</p>
            ) : (
              rankChanges.slice(0, 12).map((r) => (
                <div
                  key={r.class}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs"
                >
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{r.class}</p>
                    <p className="text-white/40 mt-0.5">
                      حالي {r.current} → محاكى {r.simulated}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={clsx(
                        'font-mono px-2 py-0.5 rounded-full border',
                        r.delta > 0 && 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
                        r.delta < 0 && 'text-red-300 bg-red-500/10 border-red-500/20',
                        r.delta === 0 && 'text-white/40 bg-white/5 border-white/10',
                      )}
                    >
                      {r.delta > 0 ? `+${r.delta}` : r.delta}
                    </span>
                    {r.rankDelta !== 0 && (
                      <span className="text-white/30 text-[10px]">
                        #{r.currentRank}→#{r.simRank}
                      </span>
                    )}
                    {r.rankDelta === 0 && r.delta === 0 && <Minus className="w-3 h-3 text-white/30" />}
                    {r.delta > 0 && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                    {r.delta < 0 && <TrendingDown className="w-3 h-3 text-red-400" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </HorizonCardWrapper>
  );
}

function HorizonCardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-[#111c44]/80 backdrop-blur-sm p-5 shadow-lg">
      {children}
    </div>
  );
}
