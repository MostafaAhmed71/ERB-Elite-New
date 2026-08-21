import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Crown, MinusCircle } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { teacherEvaluationService } from '../../../lib/teacherEvaluation/service';
import { monthLabelAr, formatEvalError } from '../../../lib/teacherEvaluation/scoring';
import { TeacherEvaluationForm } from '../../../components/teacherEvaluation/TeacherEvaluationForm';
import { EvaluationLeaderboard } from '../../../components/teacherEvaluation/EvaluationLeaderboard';
import { TeacherEvalReportPanel } from '../../../components/teacherEvaluation/TeacherEvalReportPanel';
import {
  AcademicLayout,
  AcademicPageHeader,
  academicInputClass,
  academicBtnPrimary,
  academicBtnSecondary,
} from '../../../components/academic/AcademicUi';
import { TapHandLoader } from '../../../components/ui/TapHandLoader';

export function PrincipalEvaluationCyclePage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [dedTitle, setDedTitle] = useState('');
  const [dedPoints, setDedPoints] = useState(2);
  const [dedReason, setDedReason] = useState('');

  const { data: cycle, isLoading: cycleLoading } = useQuery({
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
  const { data: teachers = [] } = useQuery({
    queryKey: ['academic-teachers'],
    queryFn: () => import('../../../lib/academic/adminService').then((m) => m.academicAdminService.listTeachers()),
  });
  const { data: leaderboard = [], isLoading: lbLoading } = useQuery({
    queryKey: ['teval-leaderboard', cycleId],
    queryFn: () => teacherEvaluationService.computeLeaderboard(cycleId),
    enabled: !!cycleId,
  });
  const { data: deductions = [] } = useQuery({
    queryKey: ['teval-deductions', cycleId],
    queryFn: () => teacherEvaluationService.listDeductions(cycleId),
    enabled: !!cycleId,
  });
  const { data: dedTypes = [] } = useQuery({
    queryKey: ['teval-ded-types'],
    queryFn: teacherEvaluationService.listDeductionTypes,
  });

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId) ?? teachers[0] ?? null;
  const effectiveTeacherId = selectedTeacherId ?? selectedTeacher?.id ?? null;

  const { data: submission } = useQuery({
    queryKey: ['teval-submission', cycleId, effectiveTeacherId, 'principal', user?.id],
    queryFn: async () => {
      if (!cycleId || !effectiveTeacherId || !user?.id) return null;
      return teacherEvaluationService.getOrCreateSubmission({
        cycleId,
        teacherId: effectiveTeacherId,
        source: 'principal',
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

  const { data: report } = useQuery({
    queryKey: ['teval-report', cycleId, effectiveTeacherId],
    queryFn: () => teacherEvaluationService.getTeacherReport(cycleId, effectiveTeacherId!),
    enabled: !!cycleId && !!effectiveTeacherId,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['teval-leaderboard', cycleId] });
    qc.invalidateQueries({ queryKey: ['teval-report', cycleId] });
    qc.invalidateQueries({ queryKey: ['teval-deductions', cycleId] });
    qc.invalidateQueries({ queryKey: ['teval-submission'] });
  };

  const closeMut = useMutation({
    mutationFn: () => {
      const top = leaderboard[0];
      return teacherEvaluationService.closeCycle(cycleId, top?.teacherId ?? null);
    },
    onSuccess: refresh,
  });

  const setTomMut = useMutation({
    mutationFn: (teacherId: string) => teacherEvaluationService.setTeacherOfMonth(cycleId, teacherId),
    onSuccess: refresh,
  });

  const addDedMut = useMutation({
    mutationFn: () =>
      teacherEvaluationService.addDeduction({
        cycle_id: cycleId,
        teacher_id: effectiveTeacherId!,
        title: dedTitle,
        points: dedPoints,
        reason: dedReason,
        created_by: user?.id,
      }),
    onSuccess: () => {
      setDedTitle('');
      setDedReason('');
      refresh();
    },
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async (scores: Parameters<typeof teacherEvaluationService.saveSubmissionDraft>[1], notes: string) => {
    if (!submission) {
      alert('تعذّر إنشاء التقييم. أعد تحميل الصفحة وتأكد من تطبيق قاعدة البيانات.');
      return;
    }
    setSaving(true);
    try {
      await teacherEvaluationService.saveSubmissionDraft(submission.id, scores, criteria, notes);
      await refresh();
      alert('تم حفظ التقييم وتحديث لوحة المتصدرين');
    } catch (e) {
      alert('خطأ في الحفظ: ' + formatEvalError(e));
    } finally {
      setSaving(false);
    }
  };

  if (cycleLoading || !cycle) {
    return (
      <AcademicLayout>
        <TapHandLoader />
      </AcademicLayout>
    );
  }

  const teacherDeductions = deductions.filter((d) => d.teacher_id === effectiveTeacherId);

  return (
    <AcademicLayout size="6xl">
      <AcademicPageHeader
        title={`تقييم ${monthLabelAr(cycle.year, cycle.month)}`}
        backTo="/principal/evaluation"
        subtitle={cycle.status === 'open' ? 'الدورة مفتوحة' : 'الدورة مغلقة'}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {cycle.status === 'open' && (
          <button type="button" className={academicBtnSecondary} onClick={() => closeMut.mutate()}>
            إغلاق الشهر وتحديد معلم الشهر تلقائياً
          </button>
        )}
        {effectiveTeacherId && (
          <button
            type="button"
            className={academicBtnSecondary}
            onClick={() => setTomMut.mutate(effectiveTeacherId)}
          >
            <Crown className="w-4 h-4" /> تعيين كمعلم الشهر
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          {lbLoading ? <TapHandLoader /> : (
            <EvaluationLeaderboard
              results={leaderboard}
              selectedId={effectiveTeacherId ?? undefined}
              onSelect={setSelectedTeacherId}
            />
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="horizon-card rounded-[20px] bg-[#111c44] p-5">
            <label className="block mb-4">
              <span className="text-[#A3AED0] text-xs mb-1 block">المعلم</span>
              <select
                className={academicInputClass}
                value={effectiveTeacherId ?? ''}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </label>

            {submission && (
              <TeacherEvaluationForm
                axes={axes}
                criteria={criteria}
                source="principal"
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
            )}
          </div>

          {/* خصومات */}
          <div className="horizon-card rounded-[20px] bg-[#111c44] p-5 space-y-3">
            <h3 className="text-white font-bold flex items-center gap-2">
              <MinusCircle className="w-5 h-5 text-rose-400" /> الخصومات
            </h3>
            {teacherDeductions.length > 0 && (
              <ul className="text-sm space-y-1">
                {teacherDeductions.map((d) => (
                  <li key={d.id} className="flex justify-between text-[#A3AED0]">
                    <span>{d.title} {d.reason && `— ${d.reason}`}</span>
                    <span className="text-rose-300">−{d.points}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid sm:grid-cols-3 gap-2">
              <select
                className={academicInputClass}
                value={dedTitle}
                onChange={(e) => {
                  const t = dedTypes.find((x) => x.title === e.target.value);
                  setDedTitle(e.target.value);
                  if (t) setDedPoints(Number(t.default_points));
                }}
              >
                <option value="">نوع الخصم...</option>
                {dedTypes.map((t) => (
                  <option key={t.id} value={t.title}>{t.title}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                className={academicInputClass}
                value={dedPoints}
                onChange={(e) => setDedPoints(+e.target.value)}
              />
              <input
                className={academicInputClass}
                placeholder="سبب"
                value={dedReason}
                onChange={(e) => setDedReason(e.target.value)}
              />
            </div>
            <button
              type="button"
              className={academicBtnSecondary}
              disabled={!dedTitle || !effectiveTeacherId}
              onClick={() => addDedMut.mutate()}
            >
              إضافة خصم
            </button>
          </div>

          {report && (
            <div className="horizon-card rounded-[20px] bg-[#111c44] p-5">
              <h3 className="text-white font-bold mb-4">تقرير المعلم</h3>
              <TeacherEvalReportPanel report={report} />
            </div>
          )}
        </div>
      </div>
    </AcademicLayout>
  );
}
