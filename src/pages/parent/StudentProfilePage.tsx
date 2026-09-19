import { User, Award, AlertCircle } from 'lucide-react';
import { useParentChildren } from '../../hooks/useParentChildren';
import { useStudentMetrics } from '../../hooks/useStudentMetrics';
import { ParentPageShell } from '../../components/parent/ParentPageShell';
import { StudentMetricsOverview } from '../../components/shared/StudentMetricsOverview';
import { ClassAverageComparison } from '../../components/shared/ClassAverageComparison';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { getPointsStatusLabel } from '../../lib/pointsStatusLabels';
import { BarsLoader } from '../../components/ui/BarsLoader';
import clsx from 'clsx';

export function StudentProfilePage() {
  const { children, isLoading: childrenLoading, selectedChild } = useParentChildren();
  const metrics = useStudentMetrics(selectedChild?.id);

  const isLoading = childrenLoading || metrics.isLoading;

  if (isLoading && children.length === 0) {
    return <BarsLoader label="جاري تحميل الملف..." fullScreen />;
  }

  if (children.length === 0) {
    return (
      <ParentPageShell showChildBar={false}>
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-6 glass-card">
          <AlertCircle className="w-12 h-12 text-gold-400 mb-3" />
          <h2 className="text-white font-bold text-lg">لا يوجد أبناء مرتبطين بحسابك</h2>
          <p className="text-white/40 text-sm mt-1">يرجى الاتصال بالدعم الفني أو إدارة المدرسة لإدخال بيانات الأبناء.</p>
        </div>
      </ParentPageShell>
    );
  }

  return (
    <ParentPageShell>
      <div className="space-y-6">
        {selectedChild && (
          <>
            <div className="glass-card p-6">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-secondary)] flex items-center justify-center text-on-contrast text-3xl font-bold shadow-xl">
                  {selectedChild.full_name.charAt(0)}
                </div>
                <div className="text-center sm:text-right">
                  <h1 className="text-xl font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                    <User className="w-5 h-5 text-gold-400" />
                    {selectedChild.full_name}
                  </h1>
                  <p className="text-gold-400 text-sm mt-1 font-medium">{selectedChild.grade} — {selectedChild.class_name}</p>
                  <p className="text-white/40 text-xs mt-1 font-mono">الرقم الأكاديمي: {selectedChild.admission_number}</p>
                </div>
              </div>
            </div>

            {!metrics.isLoading && (
              <>
                <StudentMetricsOverview
                  totalPoints={metrics.totalPoints}
                  level={metrics.level}
                  breakdown={metrics.breakdown}
                  achievements={metrics.achievements}
                  progressPercent={metrics.progressPercent}
                  pointsToNext={metrics.pointsToNext}
                />

                <ClassAverageComparison studentScore={metrics.totalPoints} classAverage={metrics.classAverage} />

                <ActivityTimeline studentId={selectedChild.id} limit={10} />
              </>
            )}

            <div className="glass-card p-6">
              <h3 className="text-white font-semibold text-base mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
                <Award className="w-4 h-4 text-gold-400" />
                سجل نقاط التميز للابن
              </h3>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {metrics.points.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-white/20 text-sm">لا توجد نقاط مسجلة للابن حالياً</div>
                ) : (
                  metrics.points.map((p) => (
                    <div key={p.id} className="p-3 bg-white/3 border border-white/5 rounded-xl flex items-center justify-between gap-3 text-sm">
                      <div className="space-y-1">
                        <p className="text-white font-medium">{p.activities?.name ?? 'نشاط عام'}</p>
                        <p className="text-xs text-white/40">
                          بواسطة: {p.granted_by_user?.full_name ?? 'معلم'} • {new Date(p.created_at).toLocaleDateString('ar-EG')}
                        </p>
                        {p.note && <p className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded italic">{p.note}</p>}
                      </div>
                      <div className="text-left shrink-0">
                        <span className={clsx('text-base font-bold', p.status === 'approved' ? 'text-gold-400' : 'text-white/30')}>
                          {p.points > 0 ? `+${p.points}` : p.points} ن
                        </span>
                        <p className={clsx('text-[10px] mt-1 px-1.5 py-0.5 rounded border block',
                          p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          p.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        )}>
                          {getPointsStatusLabel(p.status)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {selectedChild && metrics.isLoading && <BarsLoader label="جاري تحميل بيانات الابن..." />}
      </div>
    </ParentPageShell>
  );
}
