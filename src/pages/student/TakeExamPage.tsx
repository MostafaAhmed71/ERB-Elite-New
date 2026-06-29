import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, CheckCircle2, Clock, AlertCircle, ArrowRight, GraduationCap } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { DbExam, DbQuestion, ExamResultDetail } from '../../types';
import { getExamWindowStatus, formatExamWindowMessage } from '../../lib/examSchedule';
import { inferExamType } from '../../lib/examAnalytics';
import { selectAdaptiveQuestions } from '../../lib/adaptiveExam';
import { embedOne } from '../../lib/supabaseEmbeds';
import { DocumentPageLoader } from '../../components/ui/DocumentPageLoader';
import { gradeAnswer, parseMatchingOptions, serializeMatchingAnswer } from '../../lib/questionGrading';
import { fetchExamPointsPolicy, calcExamProposedPoints, matchesExamPolicyScope } from '../../lib/examPointsPolicy';
import { toast } from 'react-hot-toast';

interface ExamQuestion extends DbQuestion {
  skills: { subject_name: string; skill_name: string } | null;
  order_index: number;
}

type TakeExamPageProps = {
  practiceMode?: boolean;
};

export function TakeExamPage({ practiceMode = false }: TakeExamPageProps) {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const submittedRef = useRef(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [result, setResult] = useState<{ score: number; max: number; details: { is_correct: boolean; correct_answer: string; student_answer?: string; skill_id?: string }[] } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [endsAtLeft, setEndsAtLeft] = useState<number | null>(null);

  const { data: studentRecord, isLoading: studentLoading } = useQuery({
    queryKey: ['my_student'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('id, grade').eq('user_id', user!.id).single();
      if (error) return null;
      return data as { id: string; grade: string };
    },
    enabled: !!user,
  });

  const { data: activeExam, isLoading: examLoading, error: examError } = useQuery({
    queryKey: ['student_exam', examId],
    queryFn: async () => {
      const { data, error } = await supabase.from('exams').select('*').eq('id', examId!).single();
      if (error) throw error;
      return data as DbExam;
    },
    enabled: !!examId,
  });

  const windowStatus = activeExam ? getExamWindowStatus(activeExam) : 'open';

  const examViewAllowed =
    !!activeExam &&
    !!studentRecord &&
    activeExam.is_active &&
    activeExam.grade === studentRecord.grade;

  const isAdaptive = activeExam ? inferExamType(activeExam.title, (activeExam as DbExam & { exam_type?: string }).exam_type) === 'adaptive' : false;

  const { data: examQuestions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['exam_questions_take', examId, studentRecord?.id, isAdaptive, practiceMode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_questions')
        .select('order_index, questions:question_id(*, skills:skill_id(subject_name, skill_name))')
        .eq('exam_id', examId!)
        .order('order_index');
      if (error) throw error;
      const all = (data ?? []).map((r: { order_index: number; questions: ExamQuestion | ExamQuestion[] }) => {
        const question = embedOne(r.questions);
        return {
          ...(question as ExamQuestion),
          order_index: r.order_index,
        };
      }) as ExamQuestion[];

      if (!isAdaptive || !studentRecord || !activeExam) return all;

      const { data: skills } = await supabase
        .from('skills')
        .select('*')
        .eq('grade', activeExam.grade ?? '')
        .eq('subject_name', activeExam.subject_name ?? '');

      const { data: prior } = await supabase
        .from('exam_results')
        .select('details, exams!inner(grade, subject_name)')
        .eq('student_id', studentRecord.id);

      const priorSameSubject = (prior ?? []).filter((r: { exams: { grade: string; subject_name: string } | { grade: string; subject_name: string }[] }) => {
        const exam = embedOne(r.exams);
        return exam?.grade === activeExam.grade && exam?.subject_name === activeExam.subject_name;
      });

      const picked = selectAdaptiveQuestions(
        all,
        skills ?? [],
        priorSameSubject as Array<{ details: ExamResultDetail[] | null }>
      );
      return picked.length > 0 ? picked : all.slice(0, 8);
    },
    enabled: !!examId && examViewAllowed && (practiceMode || windowStatus === 'open'),
  });

  const { data: existingResult, isLoading: resultLoading } = useQuery({
    queryKey: ['exam_result', examId, studentRecord?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('exam_results')
        .select('*')
        .eq('exam_id', examId!)
        .eq('student_id', studentRecord!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!examId && !!studentRecord && examViewAllowed && !practiceMode,
  });

  const alreadySubmitted = practiceMode ? submitted : (!!existingResult || submitted);

  const buildResultFromAnswers = () => {
    const details = examQuestions.map(q => {
      const studentAnswer = answers[q.id] ?? '';
      const isCorrect = gradeAnswer(studentAnswer, q.correct_answer, q.type);
      return {
        question_id: q.id,
        student_answer: studentAnswer,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        skill_id: q.skill_id,
      };
    });
    const score = details.filter(d => d.is_correct).length;
    return { score, max: examQuestions.length, details };
  };

  const finishPractice = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const data = buildResultFromAnswers();
    setResult(data);
    setSubmitted(true);
    toast.success('انتهى التدريب — لم تُسجَّل محاولة رسمية');
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (submittedRef.current || existingResult) {
        throw new Error('لقد أجريت هذا الاختبار مسبقاً');
      }
      if (!studentRecord || !activeExam) throw new Error('خطأ في البيانات');

      const { data: prior } = await supabase
        .from('exam_results')
        .select('id')
        .eq('exam_id', activeExam.id)
        .eq('student_id', studentRecord.id)
        .maybeSingle();
      if (prior) throw new Error('لقد أجريت هذا الاختبار مسبقاً');

      const details = examQuestions.map(q => {
        const studentAnswer = answers[q.id] ?? '';
        const isCorrect = gradeAnswer(studentAnswer, q.correct_answer, q.type);
        return {
          question_id: q.id,
          student_answer: studentAnswer,
          correct_answer: q.correct_answer,
          is_correct: isCorrect,
          skill_id: q.skill_id,
        };
      });
      const score = details.filter(d => d.is_correct).length;
      const { data: inserted, error } = await supabase.from('exam_results').insert({
        exam_id: activeExam.id,
        student_id: studentRecord.id,
        score,
        max_score: examQuestions.length,
        details,
        submitted_at: new Date().toISOString(),
      }).select('id').single();
      if (error) {
        if (error.code === '23505') throw new Error('لقد أجريت هذا الاختبار مسبقاً');
        throw error;
      }
      submittedRef.current = true;
      return { score, max: examQuestions.length, details, resultId: inserted?.id };
    },
    onSuccess: async (data) => {
      setResult(data);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['exam_result', examId] });
      queryClient.invalidateQueries({ queryKey: ['student_exam_results'] });
      toast.success('تم تسليم الاختبار!');

      try {
        const policy = await fetchExamPointsPolicy();
        if (
          policy.enabled &&
          policy.activity_id &&
          activeExam &&
          matchesExamPolicyScope(policy, activeExam)
        ) {
          const proposed = calcExamProposedPoints(policy, data.score, data.max);
          if (proposed > 0) {
            toast('اقتراح نقاط قيد مراجعة رائد النشاط', { icon: '📋' });
          }
        }
      } catch {
        /* optional hint */
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!alreadySubmitted && !submitMutation.isPending && !reviewMode) {
      setReviewMode(true);
    }
  };

  const handleConfirmSubmit = () => {
    if (!alreadySubmitted && !submitMutation.isPending) submitMutation.mutate();
  };

  useEffect(() => {
    if (!activeExam?.duration_min || alreadySubmitted) return;
    setTimeLeft(activeExam.duration_min * 60);
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t !== null && t <= 1) {
          clearInterval(interval);
          if (!submittedRef.current && !existingResult) {
            if (practiceMode) finishPractice();
            else submitMutation.mutate();
          }
          return 0;
        }
        return t !== null ? t - 1 : null;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeExam, alreadySubmitted, existingResult, submitMutation, practiceMode]);

  useEffect(() => {
    if (practiceMode || !activeExam?.ends_at || alreadySubmitted) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(activeExam.ends_at!).getTime() - Date.now()) / 1000));
      setEndsAtLeft(left);
      if (left <= 0 && !submittedRef.current && !existingResult) {
        submitMutation.mutate();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeExam?.ends_at, alreadySubmitted, existingResult, submitMutation, practiceMode]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (examLoading || questionsLoading || resultLoading || studentLoading) {
    return <DocumentPageLoader label="جاري تحميل الاختبار..." fullScreen />;
  }

  if (!examId || examError || !activeExam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center" dir="rtl">
        <AlertCircle className="w-12 h-12 text-red-400/60 mb-4" />
        <p className="text-white/40">الاختبار غير موجود</p>
        <Link to="/student/exams" className="text-gold-400 text-sm mt-4 hover:underline">العودة لاختباراتي</Link>
      </div>
    );
  }

  if (!studentRecord) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center" dir="rtl">
        <p className="text-white/40">لم يُربط حسابك بملف طالب</p>
      </div>
    );
  }

  if (!examViewAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center" dir="rtl">
        <AlertCircle className="w-12 h-12 text-amber-400/60 mb-4" />
        <p className="text-white/40 text-lg">هذا الاختبار غير متاح لك</p>
        <p className="text-white/20 text-sm mt-2">
          {!activeExam.is_active
            ? 'الاختبار غير مفعّل حالياً'
            : activeExam.grade !== studentRecord.grade
              ? `الاختبار مخصص لـ ${activeExam.grade} وصفك ${studentRecord.grade}`
              : 'لا يمكنك الوصول لهذا الاختبار'}
        </p>
        <Link to="/student/exams" className="text-gold-400 text-sm mt-4 hover:underline">العودة لاختباراتي</Link>
      </div>
    );
  }

  if (!practiceMode && windowStatus !== 'open' && !existingResult && !resultLoading && !submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center" dir="rtl">
        <Clock className="w-12 h-12 text-amber-400/60 mb-4" />
        <p className="text-white/40 text-lg">{formatExamWindowMessage(windowStatus, activeExam)}</p>
        <Link to="/student/exams" className="text-gold-400 text-sm mt-4 hover:underline">العودة لاختباراتي</Link>
      </div>
    );
  }

  if (examQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center" dir="rtl">
        <ClipboardList className="w-12 h-12 text-white/20 mb-4" />
        <p className="text-white/40">لم يُضف أسئلة لهذا الاختبار بعد</p>
        <Link to="/student/exams" className="text-gold-400 text-sm mt-4 hover:underline">العودة لاختباراتي</Link>
      </div>
    );
  }

  const renderReviewDetails = (details: ExamResultDetail[] | { is_correct: boolean; correct_answer: string; student_answer?: string; skill_id?: string }[]) => (
    <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-5 text-right space-y-3">
      <h2 className="text-white font-semibold text-sm">تفاصيل الإجابات</h2>
      {details.map((d, i) => (
        <div key={i} className={clsx('flex items-center gap-2 p-2 rounded-lg flex-wrap', d.is_correct ? 'bg-emerald-500/5' : 'bg-red-500/5')}>
          {d.is_correct ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
          <span className="text-white/60 text-xs">سؤال {i + 1}</span>
          <span className={clsx('text-[10px] px-1.5 py-0.5 rounded', d.is_correct ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10')}>
            {d.is_correct ? 'صحيح' : 'خطأ'}
          </span>
          {!d.is_correct && (
            <span className="text-white/30 text-xs mr-auto">
              إجابتك: {(d as ExamResultDetail).student_answer ?? '—'} — الصحيح: {d.correct_answer}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  if (!practiceMode && existingResult && !submitted) {
    const r = existingResult as { score: number; max_score: number; details: ExamResultDetail[] | null };
    const showReview = activeExam.allow_review !== false && r.details && r.details.length > 0;
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-8" dir="rtl">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <div>
          <p className="text-white text-xl font-bold mb-2">لقد أجريت هذا الاختبار مسبقاً</p>
          <p className="text-white/40 text-sm mb-1">لا يمكن إعادة الحل — محاولة واحدة فقط</p>
          <p className="text-white/40">
            النتيجة: <span className="text-gold-400 font-bold">{r.score}/{r.max_score}</span>
          </p>
        </div>
        {showReview && renderReviewDetails(r.details!)}
        <Link to="/student/exams" className="text-gold-400 text-sm hover:underline inline-flex items-center gap-1">
          <ArrowRight className="w-4 h-4" />
          العودة لاختباراتي
        </Link>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-8" dir="rtl">
        <div className={clsx(
          'w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-lg',
          practiceMode
            ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-cyan-500/25'
            : 'bg-gradient-to-br from-gold-400 to-gold-600 shadow-gold-500/25'
        )}>
          <span className="text-navy-950 text-2xl font-bold">{result.score}/{result.max}</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {practiceMode ? 'انتهى التدريب!' : 'تم تسليم الاختبار!'}
          </h1>
          <p className="text-white/50">
            {activeExam.subject_name} — النسبة:{' '}
            <span className="text-gold-400 font-bold">{Math.round((result.score / result.max) * 100)}%</span>
          </p>
          {practiceMode && (
            <p className="text-cyan-300/80 text-xs mt-2">لم تُسجَّل محاولة رسمية — يمكنك التدريب مجدداً</p>
          )}
        </div>
        {(practiceMode || activeExam.allow_review !== false) && renderReviewDetails(result.details)}
        <Link to="/student/exams" className="inline-flex items-center gap-2 text-gold-400 text-sm hover:underline">
          <ArrowRight className="w-4 h-4" />
          العودة لاختباراتي
        </Link>
      </div>
    );
  }

  if (reviewMode && !submitted) {
    const unanswered = examQuestions.filter((q) => !answers[q.id]?.trim()).length;
    return (
      <div className="space-y-6 max-w-3xl mx-auto" dir="rtl">
        <div>
          <h1 className="text-xl font-bold text-white">مراجعة الإجابات قبل الإرسال</h1>
          <p className="text-white/40 text-sm mt-1">
            {practiceMode
              ? 'تأكد من إجاباتك — وضع تدريبي بدون تسجيل رسمي'
              : 'تأكد من إجاباتك — لا يمكن التعديل بعد الإرسال (محاولة واحدة)'}
            {unanswered > 0 && <span className="text-amber-400 block mt-1">⚠ {unanswered} سؤال بدون إجابة</span>}
          </p>
        </div>
        <div className="space-y-3">
          {examQuestions.map((q, index) => (
            <div key={q.id} className="bg-navy-900/50 border border-white/5 rounded-xl p-4 text-sm">
              <p className="text-white/80">
                <span className="text-gold-400 font-bold ml-2">{index + 1}.</span>
                {q.question_text}
              </p>
              <p className="text-gold-300/80 text-xs mt-2">
                إجابتك: {answers[q.id]?.trim() ? answers[q.id] : <span className="text-amber-400">لم تُجب</span>}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-center pb-6">
          <button
            type="button"
            onClick={() => setReviewMode(false)}
            className="px-6 py-3 rounded-xl border border-white/10 text-white/70 text-sm hover:bg-white/5"
          >
            العودة للتعديل
          </button>
          <button
            type="button"
            onClick={practiceMode ? finishPractice : handleConfirmSubmit}
            disabled={!practiceMode && submitMutation.isPending}
            className="px-8 py-3 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 rounded-xl font-bold text-sm disabled:opacity-60"
          >
            {!practiceMode && submitMutation.isPending
              ? 'جاري التسليم...'
              : practiceMode
                ? 'إنهاء التدريب وعرض النتيجة'
                : 'تأكيد الإرسال النهائي'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto" dir="rtl">
      <Link to="/student/exams" className="inline-flex items-center gap-1 text-white/40 hover:text-white text-sm transition-colors">
        <ArrowRight className="w-4 h-4" />
        العودة لاختباراتي
      </Link>

      {practiceMode && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300 text-xs">
          <GraduationCap className="w-4 h-4 shrink-0" />
          <span>وضع تدريبي — لن تُستهلك محاولتك الرسمية ولن تُحفظ النتيجة في سجلك</span>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-cyan-400/80 text-xs mb-1">{activeExam.subject_name} — {activeExam.grade}</p>
          <h1 className="text-xl font-bold text-white">{activeExam.title}{practiceMode ? ' (تدريب)' : ''}</h1>
          <p className="text-white/40 text-sm">{examQuestions.length} سؤال</p>
        </div>
        {timeLeft !== null && (
          <div className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-lg font-bold',
            timeLeft < 300 ? 'border-red-500/25 bg-red-500/10 text-red-400' : 'border-gold-500/25 bg-gold-500/10 text-gold-400'
          )}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        )}
        {endsAtLeft !== null && activeExam.ends_at && (
          <div className={clsx('flex flex-col items-end px-3 py-2 rounded-xl border text-xs',
            endsAtLeft < 600 ? 'border-red-500/25 bg-red-500/10 text-red-400' : 'border-purple-500/25 bg-purple-500/10 text-purple-300'
          )}>
            <span className="text-[10px] text-white/40">ينتهي الاختبار</span>
            <span className="font-mono font-bold">{formatTime(endsAtLeft)}</span>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {examQuestions.map((q, index) => (
          <div key={q.id} className="bg-navy-900/50 border border-white/5 rounded-2xl p-5">
            <p className="text-white font-medium mb-1 leading-relaxed">
              <span className="text-gold-400 font-bold ml-2">{index + 1}.</span>
              {q.question_text}
            </p>
            <p className="text-white/30 text-xs mb-4">{(q as ExamQuestion).skills?.skill_name}</p>

            {q.type === 'TF' ? (
              <div className="flex gap-3">
                {['true', 'false'].map(v => (
                  <button key={v} type="button" onClick={() => setAnswers(prev => ({ ...prev, [q.id]: v }))}
                    className={clsx('flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all',
                      answers[q.id] === v ? 'bg-gold-500/15 border-gold-500/30 text-gold-300' : 'border-white/10 text-white/50 hover:text-white hover:border-white/20'
                    )}>
                    {v === 'true' ? '✓ صح' : '✗ خطأ'}
                  </button>
                ))}
              </div>
            ) : q.type === 'FILL_BLANK' || q.type === 'SHORT_ANSWER' ? (
              q.type === 'SHORT_ANSWER' ? (
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  rows={3}
                  placeholder="اكتب إجابتك..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm resize-none"
                />
              ) : (
                <input
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="أكمل الفراغ..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
                />
              )
            ) : q.type === 'MATCHING' ? (
              <div className="space-y-2">
                {parseMatchingOptions(q.options).pairs.map((pair) => {
                  const rights = parseMatchingOptions(q.options).pairs.map((p) => p.right);
                  const selected = answers[q.id] ? answers[q.id].split('|').find((s) => s.startsWith(`${pair.left}:`))?.split(':')[1] ?? '' : '';
                  return (
                    <div key={pair.left} className="flex items-center gap-2 flex-wrap">
                      <span className="text-white/70 text-sm min-w-[80px]">{pair.left}</span>
                      <select
                        value={selected}
                        onChange={(e) => {
                          const current: Record<string, string> = {};
                          for (const seg of (answers[q.id] ?? '').split('|').filter(Boolean)) {
                            const [l, r] = seg.split(':');
                            if (l && r) current[l] = r;
                          }
                          current[pair.left] = e.target.value;
                          setAnswers((prev) => ({ ...prev, [q.id]: serializeMatchingAnswer(current) }));
                        }}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                      >
                        <option value="">اختر</option>
                        {rights.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {(Array.isArray(q.options) ? q.options : []).map((opt, i) => (
                  <button key={i} type="button" onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                    className={clsx('w-full text-right px-4 py-2.5 rounded-xl border text-sm transition-all',
                      answers[q.id] === opt ? 'bg-gold-500/15 border-gold-500/30 text-gold-300' : 'border-white/10 text-white/60 hover:text-white hover:border-white/20'
                    )}>
                    <span className="text-white/30 ml-2">{String.fromCharCode(65 + i)}.</span> {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center pb-6">
        <button type="button" onClick={handleSubmit} disabled={submitMutation.isPending || alreadySubmitted}
          className={clsx(
            'px-8 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all disabled:opacity-60',
            practiceMode
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-navy-950 hover:shadow-cyan-500/20'
              : 'bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 hover:shadow-gold-500/20'
          )}>
          {submitMutation.isPending
            ? 'جاري التسليم...'
            : practiceMode
              ? 'مراجعة وإنهاء التدريب'
              : 'مراجعة وإرسال الاختبار'}
        </button>
      </div>
    </div>
  );
}
