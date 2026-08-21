import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { teacherEvaluationService } from '../../lib/teacherEvaluation/service';
import { academicAdminService } from '../../lib/academic/adminService';
import { monthLabelAr, formatEvalError } from '../../lib/teacherEvaluation/scoring';
import { TeacherEvaluationForm } from '../../components/teacherEvaluation/TeacherEvaluationForm';
import {
  AcademicLayout,
  AcademicPageHeader,
  academicInputClass,
} from '../../components/academic/AcademicUi';
import { TapHandLoader } from '../../components/ui/TapHandLoader';

/** تقييم المعلمين من قبل الوكيل أو المشرف (20%) */
export function DeputyTeacherEvaluationPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [teacherId, setTeacherId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const { data: cycle } = useQuery({
    queryKey: ['teval-current-cycle'],
    queryFn: teacherEvaluationService.getOrCreateCurrentCycle,
  });
  const cycleId = cycle?.id ?? '';

  const { data: teachers = [] } = useQuery({
    queryKey: ['academic-teachers'],
    queryFn: () => academicAdminService.listTeachers(),
  });

  const { data: axes = [] } = useQuery({
    queryKey: ['teval-axes'],
    queryFn: teacherEvaluationService.listAxes,
  });
  const { data: criteria = [] } = useQuery({
    queryKey: ['teval-criteria'],
    queryFn: teacherEvaluationService.listCriteria,
  });

  const effectiveTeacherId = teacherId || teachers[0]?.id || '';

  const { data: submission } = useQuery({
    queryKey: ['teval-deputy-sub', cycleId, effectiveTeacherId, user?.id],
    queryFn: async () => {
      if (!cycleId || !effectiveTeacherId || !user?.id) return null;
      return teacherEvaluationService.getOrCreateSubmission({
        cycleId,
        teacherId: effectiveTeacherId,
        source: 'deputy',
        evaluatorId: user.id,
      });
    },
    enabled: !!cycleId && !!effectiveTeacherId && !!user?.id,
  });

  const { data: submissionScores = [] } = useQuery({
    queryKey: ['teval-scores', submission?.id],
    queryFn: () => teacherEvaluationService.getSubmissionScores(submission!.id),
    enabled: !!submission?.id,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['teval-deputy-sub'] });
    qc.invalidateQueries({ queryKey: ['teval-scores'] });
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

  if (!cycle) {
    return (
      <AcademicLayout>
        <TapHandLoader />
      </AcademicLayout>
    );
  }

  return (
    <AcademicLayout size="4xl">
      <AcademicPageHeader
        title="تقييم المعلمين"
        backTo="/academic"
        subtitle={`${monthLabelAr(cycle.year, cycle.month)} — وزن الوكيل/المشرف 20%`}
      />

      <div className="horizon-card rounded-[20px] bg-[#111c44] p-5">
        <label className="block mb-4">
          <span className="text-[#A3AED0] text-xs mb-1 block">المعلم</span>
          <select
            className={academicInputClass}
            value={effectiveTeacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </label>

        {submission ? (
          <TeacherEvaluationForm
            axes={axes}
            criteria={criteria}
            source="deputy"
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
    </AcademicLayout>
  );
}
