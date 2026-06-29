import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import {
  fetchTeacherSubjectAssignments,
  fetchTeacherSubjectAnalytics,
} from '../../lib/teacherAnalytics';
import { printTeacherAnalyticsPdf } from '../../lib/teacherAnalyticsPdf';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { showError } from '../../lib/toast';
import clsx from 'clsx';

/** S6/S7 — تحليلات المعلم حسب المادة */
export function TeacherAnalyticsPage() {
  const { user } = useAuthStore();
  const [selectedKey, setSelectedKey] = useState('');

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['teacher', 'subjects', user?.id],
    queryFn: () => fetchTeacherSubjectAssignments(user!.id),
    enabled: !!user,
  });

  const active = assignments.find((a) => `${a.grade}__${a.subject_name}` === selectedKey)
    ?? assignments[0];

  const selectionKey = active ? `${active.grade}__${active.subject_name}` : '';

  const { data: snapshot, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['teacher', 'analytics', user?.id, active?.grade, active?.subject_name],
    queryFn: () => fetchTeacherSubjectAnalytics(user!.id, active!.grade, active!.subject_name),
    enabled: !!user && !!active,
  });

  const handlePrint = () => {
    if (!snapshot || !user) return;
    try {
      printTeacherAnalyticsPdf(user.full_name, snapshot);
    } catch (e) {
      showError(e instanceof Error ? e : new Error('تعذّر إنشاء PDF'));
    }
  };

  if (loadingAssignments) {
    return <TapHandLoader label="جاري تحميل إسناداتك..." fullScreen />;
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-4" dir="rtl">
        <PageHeader
          icon={BarChart3}
          title="تحليلات مادتي"
          subtitle="S6/S7 — تحليل اختبارات فصلك في مادتك"
        />
        <div className="glass-card p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-white font-semibold">لم يُربَط حسابك بمادة بعد</p>
          <p className="text-white/40 text-sm mt-1">
            يقوم المشرف التربوي بربط المعلمين بالمواد من صفحة «المواد حسب الصف»
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        icon={BarChart3}
        title="تحليلات مادتي"
        subtitle="S6/S7 — أضعف المهارات في فصولك حسب مادتك"
        actions={
          <Button
            icon={<Download className="w-4 h-4" />}
            onClick={handlePrint}
            disabled={!snapshot || loadingAnalytics}
          >
            تصدير PDF
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {assignments.map((a) => {
          const key = `${a.grade}__${a.subject_name}`;
          const isActive = (selectedKey || selectionKey) === key;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedKey(key)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-semibold border transition-colors',
                isActive
                  ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300'
                  : 'bg-white/3 border-white/10 text-white/50 hover:text-white/70',
              )}
            >
              {a.grade} — {a.subject_name}
            </button>
          );
        })}
      </div>

      {loadingAnalytics ? (
        <TapHandLoader label="جاري تحليل النتائج..." />
      ) : snapshot ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-card p-5 space-y-3">
            <p className="text-white/40 text-xs">نظرة عامة</p>
            <p className="text-white text-sm">
              الفصول: <strong>{snapshot.classLabel}</strong>
            </p>
            <p className="text-white text-sm">
              الطلاب: <strong>{snapshot.studentCount}</strong>
            </p>
            <p className="text-3xl font-black text-gold-400 font-mono">
              {snapshot.avgPct ?? '—'}%
              <span className="text-sm text-white/40 font-normal mr-1">متوسط</span>
            </p>
            {snapshot.classStats && (
              <p className="text-white/50 text-xs">
                نسبة النجاح: {snapshot.classStats.passRate}% · التميز: {snapshot.classStats.excellenceRate}%
              </p>
            )}
          </div>

          <div className="glass-card p-5 lg:col-span-2 space-y-3">
            <p className="text-white font-semibold text-sm">أضعف المهارات — ركّز عليها</p>
            {snapshot.weaknesses.length === 0 ? (
              <p className="text-white/30 text-sm">لا توجد بيانات كافية بعد</p>
            ) : (
              <div className="space-y-2">
                {snapshot.weaknesses.map((w) => (
                  <div
                    key={w.skill_id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5"
                  >
                    <span className="text-white text-sm">{w.skill_name}</span>
                    <span className="text-red-400 font-mono text-sm">{w.mastery_pct}%</span>
                  </div>
                ))}
              </div>
            )}
            {snapshot.weaknesses[0] && (
              <p className="text-amber-400/80 text-xs p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                فصلك ضعيف في «{snapshot.weaknesses[0].skill_name}» — إتقان {snapshot.weaknesses[0].mastery_pct}%
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
