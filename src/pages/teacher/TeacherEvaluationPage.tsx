import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { teacherEvaluationService } from '../../lib/teacherEvaluation/service';
import { monthLabelAr, formatEvalError } from '../../lib/teacherEvaluation/scoring';
import { TeacherEvaluationForm } from '../../components/teacherEvaluation/TeacherEvaluationForm';
import { TeacherEvalReportPanel } from '../../components/teacherEvaluation/TeacherEvalReportPanel';
import {
  AcademicLayout,
  AcademicPageHeader,
} from '../../components/academic/AcademicUi';
import { TapHandLoader } from '../../components/ui/TapHandLoader';

export function TeacherEvaluationPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const { data: cycle } = useQuery({
    queryKey: ['teval-current-cycle'],
    queryFn: teacherEvaluationService.getOrCreateCurrentCycle,
  });

  const cycleId = cycle?.id ?? '';

  const { data: axes = [] } = useQuery({
    queryKey: ['teval-axes'],
    queryFn: teacherEvaluationService.listAxes,
  });
  const { data: criteria = [] } = useQuery({
    queryKey: ['teval-criteria'],
    queryFn: teacherEvaluationService.listCriteria,
  });

  const { data: submission } = useQuery({
    queryKey: ['teval-self-submission', cycleId, user?.id],
    queryFn: async () => {
      if (!cycleId || !user?.id) return null;
      return teacherEvaluationService.getOrCreateSubmission({
        cycleId,
        teacherId: user.id,
        source: 'self',
        evaluatorId: user.id,
      });
    },
    enabled: !!cycleId && !!user?.id,
  });

  const { data: submissionScores = [] } = useQuery({
    queryKey: ['teval-scores', submission?.id],
    queryFn: () => teacherEvaluationService.getSubmissionScores(submission!.id),
    enabled: !!submission?.id,
  });

  const { data: report } = useQuery({
    queryKey: ['teval-report', cycleId, user?.id],
    queryFn: () => teacherEvaluationService.getTeacherReport(cycleId, user!.id),
    enabled: !!cycleId && !!user?.id,
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['teval-leaderboard', cycleId],
    queryFn: () => teacherEvaluationService.computeLeaderboard(cycleId),
    enabled: !!cycleId,
  });

  const myRank = leaderboard.find((r) => r.teacherId === user?.id);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['teval-self-submission'] });
    qc.invalidateQueries({ queryKey: ['teval-scores'] });
    qc.invalidateQueries({ queryKey: ['teval-report', cycleId] });
    qc.invalidateQueries({ queryKey: ['teval-leaderboard', cycleId] });
  };

  const handleSave = async (
    scores: Parameters<typeof teacherEvaluationService.saveSubmissionDraft>[1],
    notes: string,
  ) => {
    if (!submission) {
      alert('تعذّر إنشاء التقييم. أعد تحميل الصفحة وتأكد من تطبيق قاعدة البيانات.');
      return;
    }
    setSaving(true);
    try {
      await teacherEvaluationService.saveSubmissionDraft(submission.id, scores, criteria, notes);
      refresh();
      alert('تم حفظ التقييم');
    } catch (e) {
      alert('خطأ في الحفظ: ' + formatEvalError(e));
    } finally {
      setSaving(false);
    }
  };

  if (!cycle || !user) {
    return (
      <AcademicLayout>
        <TapHandLoader />
      </AcademicLayout>
    );
  }

  return (
    <AcademicLayout size="4xl">
      <AcademicPageHeader
        title="تقييمي الأدائي"
        backTo="/dashboard"
        subtitle={monthLabelAr(cycle.year, cycle.month)}
      />

      {myRank && (
        <div className="rounded-xl bg-[#7551FF]/10 border border-[#7551FF]/25 px-4 py-3 mb-4 flex flex-wrap justify-between gap-2">
          <span className="text-white text-sm">ترتيبك هذا الشهر</span>
          <span className="text-white font-bold">#{myRank.rank} — {myRank.finalScore.toFixed(1)}/100</span>
        </div>
      )}

      <div className="horizon-card rounded-[20px] bg-[#111c44] p-5 mb-5">
        <h3 className="text-white font-bold mb-3">التقييم الذاتي (5%)</h3>
        {submission ? (
          <TeacherEvaluationForm
            axes={axes}
            criteria={criteria}
            source="self"
            initialScores={submissionScores.map((s) => ({
              criterion_id: s.criterion_id,
              stars: s.stars,
              score: s.score,
              notes: s.notes,
            }))}
            initialNotes={submission.notes ?? ''}
            saving={saving}
            onSave={handleSave}
          />
        ) : (
          <TapHandLoader />
        )}
      </div>

      {report && (
        <div className="horizon-card rounded-[20px] bg-[#111c44] p-5">
          <h3 className="text-white font-bold mb-4">تقريري الشهري</h3>
          <TeacherEvalReportPanel report={report} />
        </div>
      )}
    </AcademicLayout>
  );
}
