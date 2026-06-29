import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, User, ClipboardList, AlertTriangle, Phone, CalendarCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { Panel, SectionTitle } from '../../components/ui/Card';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { classifyExamWarnings, WARNING_COLORS } from '../../lib/earlyWarning';
import { computePrincipalStudentRating, ratingBadgeClass } from '../../lib/principalStudentRating';
import { summarizeAttendance } from '../../lib/attendanceScore';
import { embedOne } from '../../lib/supabaseEmbeds';
import clsx from 'clsx';

export function Student360Page() {
  const { studentId } = useParams<{ studentId: string }>();
  const [searchParams] = useSearchParams();
  const fromClasses = searchParams.get('from') === 'classes';
  const backTo = fromClasses ? '/principal/settings?tab=students' : '/principal/executive';
  const backLabel = fromClasses ? 'العودة للطلاب والتقييم' : 'العودة للوحة التنفيذية';

  const { data, isLoading } = useQuery({
    queryKey: ['principal', 'student-360', studentId],
    queryFn: async () => {
      const [studentRes, examsRes, attRes] = await Promise.all([
        supabase.from('students').select('*').eq('id', studentId!).single(),
        supabase
          .from('exam_results')
          .select('score, max_score, submitted_at, details, exams (title, subject_name)')
          .eq('student_id', studentId!)
          .order('submitted_at', { ascending: false }),
        supabase
          .from('attendance')
          .select('status, date')
          .eq('student_id', studentId!)
          .order('date', { ascending: false })
          .limit(90),
      ]);

      if (studentRes.error) throw studentRes.error;
      const student = studentRes.data;
      const exams = examsRes.data ?? [];
      const attendance = attRes.data ?? [];

      const warnings = classifyExamWarnings(
        [student],
        exams.map((e) => ({
          student_id: studentId!,
          score: e.score as number,
          max_score: e.max_score as number,
        }))
      );

      const rating = computePrincipalStudentRating(
        exams.map((e) => ({ score: e.score as number, max_score: e.max_score as number })),
        attendance.map((a) => ({ status: a.status as 'present' | 'absent' | 'late' }))
      );

      const attSummary = summarizeAttendance(
        attendance.map((a) => ({ status: a.status as 'present' | 'absent' | 'late' }))
      );

      return { student, exams, attendance, warnings, rating, attSummary };
    },
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <TapHandLoader label="جاري تحميل ملف الطالب..." fullScreen />
      </div>
    );
  }

  if (!data?.student) {
    return (
      <div className="text-center py-16 text-white/40" dir="rtl">
        <p>لم يُعثر على الطالب</p>
        <Link to={backTo} className="text-gold-400 text-sm mt-4 inline-block">
          {backLabel}
        </Link>
      </div>
    );
  }

  const { student, exams, attendance, warnings, rating, attSummary } = data;

  return (
    <div className="space-y-6" dir="rtl">
      <Link to={backTo} className="inline-flex items-center gap-1 text-white/40 hover:text-white text-sm">
        <ArrowRight className="w-4 h-4" />
        {backLabel}
      </Link>

      <PageHeader
        title={student.full_name}
        subtitle={`${student.grade} — فصل ${student.class_name}`}
        icon={User}
        badge={rating.overall != null ? `تقييم ${rating.overall}` : undefined}
      />

      {warnings.length > 0 && (
        <div
          className={clsx(
            'glass-card p-4 border flex items-start gap-3',
            WARNING_COLORS[warnings[0].level]
          )}
        >
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">{warnings[0].label}</p>
            <p className="text-xs opacity-80 mt-0.5">{warnings[0].detail}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel className="p-5 space-y-3">
          <SectionTitle icon={User} className="mb-2">
            البيانات الأساسية
          </SectionTitle>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-white/40 text-xs">رقم الهوية</p>
              <p className="text-white font-mono">{student.admission_number}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs">الصف / الفصل</p>
              <p className="text-white">
                {student.grade} — {student.class_name}
              </p>
            </div>
            {student.phone && (
              <div className="col-span-2 flex items-center gap-2">
                <Phone className="w-4 h-4 text-white/30" />
                <span className="text-white font-mono" dir="ltr">
                  {student.phone}
                </span>
              </div>
            )}
            {student.date_of_birth && (
              <div>
                <p className="text-white/40 text-xs">تاريخ الميلاد</p>
                <p className="text-white">
                  {new Date(student.date_of_birth).toLocaleDateString('ar-SA')}
                </p>
              </div>
            )}
            <div>
              <p className="text-white/40 text-xs">العام الدراسي</p>
              <p className="text-white">{student.academic_year}</p>
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle icon={CalendarCheck} className="mb-4">
            التقييم الشامل
          </SectionTitle>
          <div className="flex items-center gap-4">
            <div
              className={clsx(
                'w-20 h-20 rounded-2xl border flex flex-col items-center justify-center',
                ratingBadgeClass(rating.overall)
              )}
            >
              <span className="text-2xl font-bold tabular-nums">{rating.overall ?? '—'}</span>
              <span className="text-[10px] opacity-70">/ 100</span>
            </div>
            <div className="space-y-2 text-sm flex-1">
              <div className="flex justify-between">
                <span className="text-white/50">الاختبارات</span>
                <span className="text-white font-medium">
                  {rating.examPct != null ? `${rating.examPct}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">درجة الحضور</span>
                <span className="text-white font-medium">{rating.attendanceScore}</span>
              </div>
              <p className="text-white/30 text-xs">{rating.label}</p>
            </div>
          </div>
        </Panel>
      </div>

      <Panel className="p-6">
        <SectionTitle icon={CalendarCheck} className="mb-4">
          ملخص الحضور ({attSummary.total} يوم)
        </SectionTitle>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-emerald-400 font-bold text-xl">{attSummary.present}</p>
            <p className="text-white/40 text-xs">حاضر</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 font-bold text-xl">{attSummary.absent}</p>
            <p className="text-white/40 text-xs">غائب</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-400 font-bold text-xl">{attSummary.late}</p>
            <p className="text-white/40 text-xs">متأخر</p>
          </div>
        </div>
        {attendance.length > 0 ? (
          <div className="max-h-40 overflow-y-auto space-y-1">
            {attendance.slice(0, 14).map((a, i) => (
              <div
                key={i}
                className="flex justify-between text-xs px-3 py-2 rounded-lg bg-white/3"
              >
                <span className="text-white/50">
                  {new Date(a.date as string).toLocaleDateString('ar-SA')}
                </span>
                <span
                  className={clsx(
                    a.status === 'present'
                      ? 'text-emerald-400'
                      : a.status === 'late'
                        ? 'text-amber-400'
                        : 'text-red-400'
                  )}
                >
                  {a.status === 'present' ? 'حاضر' : a.status === 'late' ? 'متأخر' : 'غائب'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/30 text-sm text-center py-4">لا توجد سجلات حضور</p>
        )}
      </Panel>

      <Panel className="p-6">
        <SectionTitle icon={ClipboardList} className="mb-4">
          نتائج الاختبارات
        </SectionTitle>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {exams.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-6">لا توجد نتائج اختبارات</p>
          ) : (
            exams.map((e, i) => {
              const pct = e.max_score > 0 ? Math.round((e.score / e.max_score) * 100) : 0;
              const details = (e.details as { is_correct: boolean }[] | null) ?? [];
              const weak = details.filter((d) => !d.is_correct).length;
              return (
                <div key={i} className="p-3 bg-white/3 rounded-lg text-sm flex justify-between gap-3">
                  <div>
                    <p className="text-white font-medium">{embedOne<{ title: string; subject_name: string }>(e.exams)?.title}</p>
                    <p className="text-white/40 text-xs mt-1">
                      {embedOne<{ title: string; subject_name: string }>(e.exams)?.subject_name} —{' '}
                      {new Date(e.submitted_at as string).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <p
                      className={clsx(
                        'font-mono font-bold',
                        pct >= 50 ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {e.score}/{e.max_score} ({pct}%)
                    </p>
                    {weak > 0 && <p className="text-white/40 text-[10px]">{weak} أخطاء</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Panel>

      <p className="text-white/30 text-xs text-center">
        ملف الطالب — التقييم الأكاديمي والحضور (النقاط من اختصاص رائد النشاط)
      </p>
    </div>
  );
}
