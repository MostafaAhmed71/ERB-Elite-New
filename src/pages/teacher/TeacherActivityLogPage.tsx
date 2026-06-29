import { useQuery } from '@tanstack/react-query';
import { ClipboardList, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { fetchTeacherActivitySummary } from '../../lib/teacherActivityLog';
import { POINT_AXIS_OPTIONS } from '../../lib/pointsReference';
import { PageHeader } from '../../components/ui/PageHeader';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { getPointsStatusLabel } from '../../lib/pointsStatusLabels';
import clsx from 'clsx';

/** T8 — سجل شخصي للمعلم */
export function TeacherActivityLogPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['teacher', 'activity-log', user?.id],
    queryFn: () => fetchTeacherActivitySummary(user!.id),
    enabled: !!user,
  });

  if (isLoading || !data) {
    return <TapHandLoader label="جاري تحميل سجلك..." fullScreen />;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        icon={ClipboardList}
        title="سجلي الشخصي"
        subtitle="T8 — كم منحت هذا الشهر؟ وفي أي محور؟"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'هذا الشهر', value: data.monthTotal, suffix: 'ن' },
          { label: 'هذا الأسبوع', value: data.weekTotal, suffix: 'ن' },
          { label: 'معتمد', value: data.approvedCount, suffix: 'عملية' },
          { label: 'معلّق', value: data.pendingCount, suffix: 'عملية' },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card p-4 text-center">
            <p className="text-white/40 text-[10px]">{kpi.label}</p>
            <p className="text-2xl font-black text-gold-400 font-mono mt-1">
              {kpi.value}
              <span className="text-xs text-white/40 mr-1">{kpi.suffix}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="glass-card p-5 space-y-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          توزيع المنح حسب المحور (هذا الشهر)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {POINT_AXIS_OPTIONS.map((axis) => (
            <div key={axis.key} className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
              <p className="text-white/40 text-[10px]">{axis.label}</p>
              <p className="text-white font-bold font-mono mt-1">{data.byAxis[axis.key]} ن</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5 space-y-3">
        <h3 className="text-white font-semibold text-sm">آخر عمليات المنح</h3>
        {data.recentGrants.length === 0 ? (
          <p className="text-white/30 text-sm">لا توجد عمليات بعد</p>
        ) : (
          <div className="space-y-2">
            {data.recentGrants.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/3 border border-white/5 text-xs"
              >
                <div>
                  <p className="text-white font-bold">{g.studentName}</p>
                  <p className="text-white/40 mt-0.5">{g.activityName}</p>
                </div>
                <div className="text-left">
                  <p className="text-gold-400 font-bold font-mono">+{g.points} ن</p>
                  <span
                    className={clsx(
                      'text-[9px] px-1.5 py-0.5 rounded border',
                      g.status === 'approved' && 'text-emerald-400 border-emerald-500/20',
                      g.status === 'pending' && 'text-amber-400 border-amber-500/20',
                      g.status === 'rejected' && 'text-red-400 border-red-500/20',
                    )}
                  >
                    {getPointsStatusLabel(g.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
