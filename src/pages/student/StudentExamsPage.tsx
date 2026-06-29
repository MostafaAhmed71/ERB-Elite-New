import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, BookOpen, CheckCircle2, Clock, ChevronLeft, GraduationCap, Brain } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { DocumentPageLoader } from '../../components/ui/DocumentPageLoader';
import type { DbExam, DbExamResult, DbStudent } from '../../types';
import clsx from 'clsx';

interface ExamWithMeta extends DbExam {
  question_count: number;
  result: DbExamResult | null;
}

export function StudentExamsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [openingExamId, setOpeningExamId] = useState<string | null>(null);

  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['my_student'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data as DbStudent;
    },
    enabled: !!user,
  });

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['student_exams', student?.grade],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('grade', student!.grade)
        .eq('is_active', true)
        .order('subject_name')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbExam[];
    },
    enabled: !!student?.grade,
  });

  const examIds = exams.map(e => e.id);

  const { data: questionCounts = {} } = useQuery({
    queryKey: ['student_exam_counts', examIds],
    queryFn: async () => {
      if (examIds.length === 0) return {};
      const { data, error } = await supabase
        .from('exam_questions')
        .select('exam_id')
        .in('exam_id', examIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const id = (row as { exam_id: string }).exam_id;
        counts[id] = (counts[id] ?? 0) + 1;
      }
      return counts;
    },
    enabled: examIds.length > 0,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['student_exam_results', student?.id, examIds],
    queryFn: async () => {
      if (!student || examIds.length === 0) return [];
      const { data, error } = await supabase
        .from('exam_results')
        .select('*')
        .eq('student_id', student.id)
        .in('exam_id', examIds);
      if (error) throw error;
      return data as DbExamResult[];
    },
    enabled: !!student && examIds.length > 0,
  });

  const resultByExam = Object.fromEntries(results.map(r => [r.exam_id, r]));

  const examsWithMeta: ExamWithMeta[] = exams.map(exam => ({
    ...exam,
    question_count: questionCounts[exam.id] ?? 0,
    result: resultByExam[exam.id] ?? null,
  }));

  const bySubject = examsWithMeta.reduce<Record<string, ExamWithMeta[]>>((acc, exam) => {
    const subject = exam.subject_name ?? 'غير محدد';
    if (!acc[subject]) acc[subject] = [];
    acc[subject].push(exam);
    return acc;
  }, {});

  const isLoading = studentLoading || examsLoading;

  if (isLoading) {
    return <DocumentPageLoader label="جاري تحميل اختباراتك..." fullScreen />;
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center" dir="rtl">
        <ClipboardList className="w-12 h-12 text-white/20 mb-4" />
        <p className="text-white/40">لم يُربط حسابك بملف طالب. راجع إدارة المدرسة.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {openingExamId && <DocumentPageLoader label="جاري فتح الاختبار..." overlay />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-gold-400" />
            اختباراتي
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {student.grade} — {student.class_name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/student/exams/prep')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-200 text-sm font-medium hover:bg-violet-500/25 transition-colors"
        >
          <Brain className="w-4 h-4" />
          وضع التحضير
        </button>
      </div>

      {examsWithMeta.length === 0 ? (
        <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-12 text-center">
          <ClipboardList className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/40">لا توجد اختبارات نشطة لصفك حالياً</p>
          <p className="text-white/20 text-sm mt-2">ستظهر الاختبارات هنا عند تفعيلها من المشرف التربوي</p>
        </div>
      ) : (
        Object.entries(bySubject).map(([subject, subjectExams]) => (
          <div key={subject} className="space-y-3">
            <h2 className="text-white/60 text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              {subject}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjectExams.map(exam => {
                const done = !!exam.result;
                const canStart = !done && exam.question_count > 0;
                const pct = exam.result && exam.result.max_score > 0
                  ? Math.round((Number(exam.result.score) / exam.result.max_score) * 100)
                  : 0;

                return (
                  <div
                    key={exam.id}
                    className={clsx(
                      'bg-navy-900/50 border rounded-2xl p-5 transition-all',
                      done ? 'border-emerald-500/20' : 'border-white/5 hover:border-gold-500/20'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold">{exam.title}</h3>
                        <p className="text-white/35 text-xs mt-1">
                          {exam.question_count} سؤال
                          {exam.duration_min ? ` • ${exam.duration_min} دقيقة` : ''}
                        </p>
                      </div>
                      {done ? (
                        <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                          مكتمل {pct}%
                        </span>
                      ) : exam.question_count === 0 ? (
                        <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs bg-amber-500/15 text-amber-300 border border-amber-500/25">
                          قيد الإعداد
                        </span>
                      ) : (
                        <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs bg-gold-500/15 text-gold-300 border border-gold-500/25 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          متاح
                        </span>
                      )}
                    </div>

                    {done && exam.result && (
                      <p className="text-gold-400 font-bold text-lg mt-3">
                        {exam.result.score}/{exam.result.max_score}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {canStart ? (
                        <button
                          type="button"
                          onClick={() => {
                            setOpeningExamId(exam.id);
                            navigate(`/student/exams/${exam.id}`);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-gold-500/20 transition-all"
                        >
                          ابدأ الاختبار
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      ) : done ? (
                        <p className="text-white/35 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          تم التسليم — محاولة واحدة فقط
                        </p>
                      ) : (
                        <p className="text-white/30 text-xs">لم يُضف أسئلة لهذا الاختبار بعد</p>
                      )}
                      {exam.question_count > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpeningExamId(exam.id);
                            navigate(`/student/exams/${exam.id}/practice`);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-500/30 text-cyan-300 text-sm hover:bg-cyan-500/10 transition-all"
                        >
                          <GraduationCap className="w-4 h-4" />
                          تدريب بدون تسجيل
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
