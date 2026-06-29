import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Brain,
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { DbQuestion, ExamResultDetail } from '../../types';
import { buildPrepQuestionSet, PREP_DURATION_MIN } from '../../lib/adaptiveExam';
import { DocumentPageLoader } from '../../components/ui/DocumentPageLoader';
import { gradeAnswer } from '../../lib/questionGrading';
import { toast } from 'react-hot-toast';

type PrepQuestion = DbQuestion & {
  skills: { subject_name: string; skill_name: string } | null;
};

export function PrepExamPage() {
  const { user } = useAuthStore();
  const submittedRef = useRef(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    max: number;
    details: ExamResultDetail[];
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(PREP_DURATION_MIN * 60);

  const { data: studentRecord, isLoading: studentLoading } = useQuery({
    queryKey: ['my_student'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, grade')
        .eq('user_id', user!.id)
        .single();
      if (error) return null;
      return data as { id: string; grade: string };
    },
    enabled: !!user,
  });

  const { data: prepQuestions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['prep-exam-questions', studentRecord?.id, studentRecord?.grade],
    queryFn: async (): Promise<PrepQuestion[]> => {
      const grade = studentRecord!.grade;
      const studentId = studentRecord!.id;

      const [{ data: skills }, { data: prior }, { data: skillRows }] = await Promise.all([
        supabase.from('skills').select('*').eq('grade', grade),
        supabase.from('exam_results').select('details').eq('student_id', studentId),
        supabase.from('skills').select('id').eq('grade', grade),
      ]);

      const skillIds = (skillRows ?? []).map((s: { id: string }) => s.id);
      if (skillIds.length === 0) return [];

      const { data: questions, error } = await supabase
        .from('questions')
        .select('*, skills:skill_id(subject_name, skill_name)')
        .in('skill_id', skillIds)
        .eq('is_active', true)
        .limit(80);

      if (error) throw error;

      const pool = (questions ?? []) as PrepQuestion[];
      const picked = buildPrepQuestionSet(
        pool,
        skills ?? [],
        (prior ?? []) as Array<{ details: ExamResultDetail[] | null }>,
      );

      return picked.length > 0 ? (picked as PrepQuestion[]) : pool.slice(0, 8);
    },
    enabled: !!studentRecord,
  });

  const finishPrep = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const details = prepQuestions.map((q) => {
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
    const score = details.filter((d) => d.is_correct).length;
    setResult({ score, max: prepQuestions.length, details });
    setSubmitted(true);
    toast.success('انتهى التحضير — راجع إجاباتك وكرّر التمرين');
  };

  useEffect(() => {
    if (submitted || prepQuestions.length === 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          if (!submittedRef.current) finishPrep();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted, prepQuestions.length]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (studentLoading || questionsLoading) {
    return <DocumentPageLoader label="جاري تجهيز أسئلة التحضير..." fullScreen />;
  }

  if (!studentRecord) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center" dir="rtl">
        <p className="text-white/40">لم يُربط حسابك بملف طالب</p>
      </div>
    );
  }

  if (prepQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center" dir="rtl">
        <ClipboardList className="w-12 h-12 text-white/20 mb-4" />
        <p className="text-white/40">لا توجد أسئلة كافية لصفك بعد</p>
        <Link to="/student/exams" className="text-gold-400 text-sm mt-4 hover:underline">
          العودة لاختباراتي
        </Link>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-8" dir="rtl">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto bg-gradient-to-br from-violet-400 to-violet-600 shadow-violet-500/25">
          <span className="text-navy-950 text-2xl font-bold">
            {result.score}/{result.max}
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">انتهى التحضير!</h1>
          <p className="text-white/50">
            النسبة:{' '}
            <span className="text-gold-400 font-bold">
              {Math.round((result.score / result.max) * 100)}%
            </span>
          </p>
          <p className="text-violet-300/80 text-xs mt-2">
            أسئلة مركّزة على نقاط ضعفك — لم تُسجَّل محاولة رسمية
          </p>
        </div>
        <Link to="/student/exams" className="inline-flex items-center gap-2 text-gold-400 text-sm hover:underline">
          <ArrowRight className="w-4 h-4" />
          العودة لاختباراتي
        </Link>
      </div>
    );
  }

  if (reviewMode) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto" dir="rtl">
        <h1 className="text-xl font-bold text-white">مراجعة قبل إنهاء التحضير</h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setReviewMode(false)}
            className="px-4 py-2 rounded-xl border border-white/10 text-white/60 text-sm"
          >
            تعديل
          </button>
          <button
            type="button"
            onClick={finishPrep}
            className="px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-bold"
          >
            إنهاء التحضير
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8" dir="rtl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-400" />
            وضع التحضير للاختبار
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {prepQuestions.length} أسئلة · مركّزة على نقاط الضعف · ST3
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/25">
          <Clock className="w-4 h-4 text-violet-300" />
          <span className="text-violet-200 font-mono font-bold">{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="space-y-6">
        {prepQuestions.map((q, idx) => (
          <div key={q.id} className="glass-card p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-violet-500/15 text-violet-300 text-sm font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium">{q.question_text}</p>
                {q.skills && (
                  <p className="text-white/30 text-[10px] mt-1">
                    {q.skills.subject_name} — {q.skills.skill_name}
                  </p>
                )}
              </div>
            </div>

            {q.type === 'MCQ' && (
              <div className="space-y-2">
                {(q.options as string[]).map((opt, i) => (
                  <label
                    key={i}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                      answers[q.id] === String(i)
                        ? 'border-violet-400/50 bg-violet-500/10'
                        : 'border-white/10 bg-white/3 hover:border-white/20',
                    )}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === String(i)}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: String(i) }))}
                      className="sr-only"
                    />
                    <span className="text-white/80 text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'TF' && (
              <div className="flex gap-2">
                {['true', 'false'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: val }))}
                    className={clsx(
                      'flex-1 py-2.5 rounded-xl border text-sm',
                      answers[q.id] === val
                        ? 'border-violet-400/50 bg-violet-500/10 text-violet-200'
                        : 'border-white/10 text-white/60',
                    )}
                  >
                    {val === 'true' ? 'صح' : 'خطأ'}
                  </button>
                ))}
              </div>
            )}

            {(q.type === 'SHORT_ANSWER' || q.type === 'FILL_BLANK') && (
              <input
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
                placeholder="اكتب إجابتك..."
              />
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setReviewMode(true)}
        className="w-full py-3 rounded-xl bg-violet-500 text-white font-bold hover:bg-violet-400 transition-colors"
      >
        إنهاء التحضير
      </button>
    </div>
  );
}
