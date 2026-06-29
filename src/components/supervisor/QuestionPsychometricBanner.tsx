import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { buildQuestionMetaFromDetails, findWeakQuestions } from '../../lib/supervisorInsights';

export function QuestionPsychometricBanner() {
  const { data: weakCount = 0 } = useQuery({
    queryKey: ['supervisor', 'weak-questions-count'],
    queryFn: async () => {
      const [resultsRes, skillsRes, questionsRes] = await Promise.all([
        supabase.from('exam_results').select('*, exams(title, subject_name, grade, exam_type)'),
        supabase.from('skills').select('id, skill_name, subject_name'),
        supabase.from('questions').select('id, question_text, skill_id'),
      ]);
      if (resultsRes.error) throw resultsRes.error;

      const skills = skillsRes.data ?? [];
      const questions = questionsRes.data ?? [];
      const skillMap = new Map(skills.map((s) => [s.id, { skill_name: s.skill_name, subject_name: s.subject_name }]));
      const questionTexts = new Map(questions.map((q) => [q.id, q.question_text]));
      const questionMeta = buildQuestionMetaFromDetails(resultsRes.data ?? [], skillMap, questionTexts);

      return findWeakQuestions(resultsRes.data ?? [], questionMeta).length;
    },
    staleTime: 120_000,
  });

  return (
    <Link
      to="/analytics/class"
      className="flex items-start gap-3 p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 hover:bg-cyan-500/10 transition-colors"
      dir="rtl"
    >
      <BarChart3 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-white text-sm font-medium">تحليل نفسومتري للأسئلة</p>
        <p className="text-white/45 text-xs mt-1">
          p-value · قوة التمييز · تنبيه الأسئلة الضعيفة — في التحليلات التعليمية
        </p>
        {weakCount > 0 && (
          <p className="text-amber-300 text-[11px] mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {weakCount} سؤال يحتاج مراجعة
          </p>
        )}
      </div>
      <span className="text-cyan-300 text-xs shrink-0">عرض ←</span>
    </Link>
  );
}
