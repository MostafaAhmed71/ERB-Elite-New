import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, CheckCircle2, ClipboardList, GraduationCap, Phone, Send, UserRound, Users,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { academicObservationService } from '../../lib/academic/adminService';
import { formatGradeSection } from '../../lib/academic/constants';
import {
  OBSERVATION_RATING_LABELS,
  OBSERVATION_RATING_OPTIONS,
} from '../../lib/academic/observationHelpers';
import type { AcademicObservationAssignment, AcademicObservationRating } from '../../lib/academic/types';
import {
  AcademicLayout, AcademicPageHeader, AcademicEmpty,
  academicBtnPrimary, academicBtnSecondary, academicInputClass,
} from '../../components/academic/AcademicUi';
import { TapHandLoader } from '../../components/ui/TapHandLoader';

type TabKey = 'pending' | 'done';

function RatingChips({
  value,
  onChange,
}: {
  value: AcademicObservationRating | '';
  onChange: (v: AcademicObservationRating) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {OBSERVATION_RATING_OPTIONS.map((r) => {
        const selected = value === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200',
              selected
                ? 'bg-gold-500 text-navy-950 border-gold-400 shadow-md shadow-gold-500/20 scale-[1.02]'
                : 'bg-white/[0.04] text-white/60 border-white/10 hover:border-gold-400/30 hover:text-white',
            )}
          >
            {OBSERVATION_RATING_LABELS[r]}
          </button>
        );
      })}
    </div>
  );
}

function RequestCard({
  assignment,
  onSubmitted,
}: {
  assignment: AcademicObservationAssignment;
  onSubmitted: () => void;
}) {
  const { user } = useAuthStore();
  const [behavioralRating, setBehavioralRating] = useState<AcademicObservationRating | ''>('');
  const [academicRating, setAcademicRating] = useState<AcademicObservationRating | ''>('');
  const [behavioralComment, setBehavioralComment] = useState('');
  const [academicComment, setAcademicComment] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [open, setOpen] = useState(assignment.status === 'pending');

  const { data: report } = useQuery({
    queryKey: ['academic-obs-report', assignment.report_id],
    queryFn: () => academicObservationService.getReport(assignment.report_id),
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('غير مسجّل');
      if (!behavioralRating || !academicRating) throw new Error('أكمل التقييم السلوكي والأكاديمي');
      return academicObservationService.submitTeacherNote({
        assignmentId: assignment.id,
        teacherId: user.id,
        teacherName: user.full_name,
        behavioral_rating: behavioralRating,
        academic_rating: academicRating,
        behavioral_comment: behavioralComment,
        academic_comment: academicComment,
        note: extraNote,
      });
    },
    onSuccess: () => {
      setBehavioralRating('');
      setAcademicRating('');
      setBehavioralComment('');
      setAcademicComment('');
      setExtraNote('');
      setOpen(false);
      onSubmitted();
    },
  });

  const studentName = report?.student_name ?? 'طالب';
  const initial = studentName.charAt(0);
  const classLabel = report
    ? report.section
      ? formatGradeSection(report.education_level, report.grade, report.section)
      : String(report.grade)
    : null;

  return (
    <article
      className={clsx(
        'relative overflow-hidden rounded-2xl border transition-all duration-300',
        assignment.status === 'pending'
          ? 'border-amber-400/20 bg-gradient-to-br from-[#152048] via-[#111c44] to-[#0e1633]'
          : 'border-emerald-400/15 bg-[#111c44]',
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            assignment.status === 'pending'
              ? 'radial-gradient(ellipse 60% 50% at 100% 0%, rgba(240,180,41,0.18), transparent 55%)'
              : 'radial-gradient(ellipse 50% 40% at 0% 0%, rgba(1,181,116,0.12), transparent 50%)',
        }}
      />

      <div className="relative p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className={clsx(
              'shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-black',
              assignment.status === 'pending'
                ? 'bg-gold-500/20 text-gold-300 border border-gold-400/30'
                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/25',
            )}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-white font-bold text-base sm:text-lg truncate">{studentName}</h3>
                {classLabel && (
                  <p className="text-[#A3AED0] text-sm mt-0.5 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                    {classLabel}
                  </p>
                )}
              </div>
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border',
                  assignment.status === 'pending'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                )}
              >
                {assignment.status === 'pending' ? (
                  <>بانتظار تقييمك</>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> تم الإرسال
                  </>
                )}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {assignment.subject && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.06] text-white/70 border border-white/10">
                  <BookOpen className="w-3 h-3 text-gold-400" />
                  {assignment.subject}
                </span>
              )}
              {report?.parent_name && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.06] text-white/70 border border-white/10">
                  <UserRound className="w-3 h-3 text-sky-400" />
                  {report.parent_name}
                </span>
              )}
              {report?.parent_phone && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.06] text-white/70 border border-white/10"
                  dir="ltr"
                >
                  <Phone className="w-3 h-3 text-emerald-400" />
                  {report.parent_phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {assignment.status === 'completed' && assignment.note && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] px-4 py-3 text-sm text-white/85 leading-relaxed">
            {assignment.note}
          </div>
        )}

        {assignment.status === 'pending' && (
          <div>
            {!open ? (
              <button
                type="button"
                className={`${academicBtnPrimary} w-full sm:w-auto`}
                onClick={() => setOpen(true)}
              >
                <Send className="w-4 h-4" />
                بدء التقييم السلوكي والأكاديمي
              </button>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-4 animate-[fadeIn_0.25s_ease]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <section className="rounded-xl border border-sky-400/20 bg-sky-500/[0.07] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-sky-300" />
                      </div>
                      <div>
                        <p className="text-sky-200 font-bold text-sm">التقييم السلوكي</p>
                        <p className="text-sky-200/50 text-[11px]">الانضباط والتفاعل</p>
                      </div>
                    </div>
                    <RatingChips value={behavioralRating} onChange={setBehavioralRating} />
                    <textarea
                      className={academicInputClass}
                      rows={2}
                      value={behavioralComment}
                      onChange={(e) => setBehavioralComment(e.target.value)}
                      placeholder="تعليق سلوكي اختياري..."
                    />
                  </section>

                  <section className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-emerald-300" />
                      </div>
                      <div>
                        <p className="text-emerald-200 font-bold text-sm">التقييم الأكاديمي</p>
                        <p className="text-emerald-200/50 text-[11px]">المستوى والمشاركة</p>
                      </div>
                    </div>
                    <RatingChips value={academicRating} onChange={setAcademicRating} />
                    <textarea
                      className={academicInputClass}
                      rows={2}
                      value={academicComment}
                      onChange={(e) => setAcademicComment(e.target.value)}
                      placeholder="تعليق أكاديمي اختياري..."
                    />
                  </section>
                </div>

                <div>
                  <label className="text-white/45 text-xs mb-1.5 block">ملاحظة إضافية لولي الأمر (اختياري)</label>
                  <textarea
                    className={academicInputClass}
                    rows={2}
                    value={extraNote}
                    onChange={(e) => setExtraNote(e.target.value)}
                    placeholder="أي ملاحظة أخرى..."
                  />
                </div>

                {submit.isError && (
                  <p className="text-red-300 text-sm">
                    {submit.error instanceof Error ? submit.error.message : 'تعذّر الحفظ'}
                  </p>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  <button type="button" className={academicBtnSecondary} onClick={() => setOpen(false)}>
                    إغلاق
                  </button>
                  <button
                    type="button"
                    className={`${academicBtnPrimary} flex-1`}
                    disabled={submit.isPending || !behavioralRating || !academicRating}
                    onClick={() => submit.mutate()}
                  >
                    <Send className="w-4 h-4" />
                    {submit.isPending ? 'جاري الإرسال...' : 'إرسال التقييم'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function TeacherObservationTasksPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>('pending');

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['teacher-obs-assignments', user?.id],
    queryFn: () => academicObservationService.listMyTeacherAssignments(user!.id),
    enabled: !!user?.id,
  });

  const pending = useMemo(() => assignments.filter((a) => a.status === 'pending'), [assignments]);
  const done = useMemo(() => assignments.filter((a) => a.status === 'completed'), [assignments]);
  const visible = tab === 'pending' ? pending : done;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['teacher-obs-assignments'] });
    qc.invalidateQueries({ queryKey: ['academic-obs-report'] });
    qc.invalidateQueries({ queryKey: ['academic-parent-requests'] });
  };

  return (
    <AcademicLayout size="2xl">
      <AcademicPageHeader
        title="طلبات ملاحظات الطلاب"
        subtitle="قيّم كل طالب سلوكياً وأكاديمياً بناءً على طلب ولي الأمر"
        backTo="/academic"
      />

      {!isLoading && assignments.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => setTab('pending')}
            className={clsx(
              'rounded-2xl border p-4 text-right transition-all duration-200',
              tab === 'pending'
                ? 'border-amber-400/40 bg-amber-500/10 shadow-lg shadow-amber-500/5'
                : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15',
            )}
          >
            <p className="text-white/45 text-xs mb-1">بانتظارك</p>
            <p className="text-2xl font-black text-amber-300">{pending.length}</p>
          </button>
          <button
            type="button"
            onClick={() => setTab('done')}
            className={clsx(
              'rounded-2xl border p-4 text-right transition-all duration-200',
              tab === 'done'
                ? 'border-emerald-400/40 bg-emerald-500/10 shadow-lg shadow-emerald-500/5'
                : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15',
            )}
          >
            <p className="text-white/45 text-xs mb-1">مكتملة</p>
            <p className="text-2xl font-black text-emerald-300">{done.length}</p>
          </button>
        </div>
      )}

      {isLoading ? (
        <TapHandLoader />
      ) : assignments.length === 0 ? (
        <AcademicEmpty message="لا توجد طلبات ملاحظات طلاب حالياً" icon={ClipboardList} />
      ) : visible.length === 0 ? (
        <AcademicEmpty
          message={tab === 'pending' ? 'لا توجد طلبات بانتظارك الآن' : 'لم تُكمل أي تقييم بعد'}
          icon={ClipboardList}
        />
      ) : (
        <div className="space-y-4">
          {visible.map((a) => (
            <RequestCard key={a.id} assignment={a} onSubmitted={refresh} />
          ))}
        </div>
      )}
    </AcademicLayout>
  );
}
