import { useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStudentMetrics } from '../../hooks/useStudentMetrics';
import { summarizeAttendance } from '../../lib/attendanceScore';
import { monthLabelAr, printParentMonthlyReport } from '../../lib/parentMonthlyReport';
import { showError } from '../../lib/toast';

type Props = {
  studentId: string;
  studentName: string;
  grade: string;
  className: string;
};

export function ParentMonthlyReport({ studentId, studentName, grade, className }: Props) {
  const metrics = useStudentMetrics(studentId);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const sinceIso = monthStart.toISOString();
  const sinceDate = monthStart.toISOString().slice(0, 10);

  const { data: monthExtras } = useQuery({
    queryKey: ['parent', 'monthly-report', studentId, sinceDate],
    queryFn: async () => {
      const [pointsRes, attRes, examRes] = await Promise.all([
        supabase
          .from('points_ledger')
          .select('points')
          .eq('student_id', studentId)
          .eq('status', 'approved')
          .gte('created_at', sinceIso),
        supabase
          .from('attendance')
          .select('status')
          .eq('student_id', studentId)
          .gte('date', sinceDate),
        supabase
          .from('exam_results')
          .select('score, max_score, submitted_at, exams(title, subject_name)')
          .eq('student_id', studentId)
          .gte('submitted_at', sinceIso)
          .order('submitted_at', { ascending: false }),
      ]);

      const monthPoints = (pointsRes.data ?? []).reduce((s, r) => s + Number(r.points), 0);
      const att = summarizeAttendance(
        (attRes.data ?? []).map((r) => ({
          status: r.status as 'present' | 'absent' | 'late',
        })),
      );

      const exams = (examRes.data ?? []).map((row) => {
        const meta = row.exams as { title: string; subject_name?: string } | { title: string; subject_name?: string }[] | null;
        const exam = Array.isArray(meta) ? meta[0] : meta;
        const max = Number(row.max_score) || 1;
        return {
          title: exam?.title ?? 'اختبار',
          subject: exam?.subject_name ?? '—',
          scorePct: Math.round((Number(row.score) / max) * 100),
          date: new Date(row.submitted_at as string).toLocaleDateString('ar-SA'),
        };
      });

      return { monthPoints, att, exams };
    },
    enabled: !!studentId,
  });

  const handlePrint = () => {
    if (!monthExtras || metrics.isLoading) {
      showError(new Error('البيانات لم تُحمَّل بعد'), 'انتظر اكتمال التحميل');
      return;
    }

    printParentMonthlyReport({
      studentName,
      grade,
      className,
      monthLabel: monthLabelAr(),
      totalPoints: metrics.totalPoints,
      levelName: metrics.level.name,
      classRank: metrics.classRank,
      monthPoints: monthExtras.monthPoints,
      present: monthExtras.att.present,
      absent: monthExtras.att.absent,
      late: monthExtras.att.late,
      attendanceRatePct: monthExtras.att.ratePct,
      exams: monthExtras.exams,
      axes: {
        activity: metrics.breakdown.activity,
        behavior: metrics.breakdown.behavior,
        achievement: metrics.breakdown.achievement,
        initiative: metrics.breakdown.initiative,
      },
    });
  };

  return (
    <div className="glass-card p-5 space-y-3" dir="rtl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-sm">تقرير شهري PDF</h3>
          <p className="text-white/40 text-[11px] mt-1">
            نقاط · حضور · اختبارات — {monthLabelAr()}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          disabled={!monthExtras || metrics.isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/15 border border-gold-500/30 text-gold-300 text-xs font-semibold hover:bg-gold-500/25 transition-colors disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" />
          تحميل التقرير
        </button>
      </div>
      {monthExtras && (
        <p className="text-white/35 text-[10px]">
          هذا الشهر: {monthExtras.monthPoints} نقطة معتمدة · {monthExtras.att.ratePct}% حضور ·{' '}
          {monthExtras.exams.length} اختبار
        </p>
      )}
    </div>
  );
}
