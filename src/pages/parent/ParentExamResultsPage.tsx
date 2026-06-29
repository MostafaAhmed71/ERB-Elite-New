import { ClipboardList, AlertCircle, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useParentChildren } from '../../hooks/useParentChildren';
import { ParentPageShell } from '../../components/parent/ParentPageShell';
import { ParentChildSelector } from '../../components/parent/ParentChildSelector';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';
import { BarsLoader } from '../../components/ui/BarsLoader';
import { computeExamSkillBreakdown } from '../../lib/examAnalytics';
import type { DbSkill, ExamResultDetail } from '../../types';

type ExamResultRow = {
  id: string;
  score: number;
  max_score: number;
  submitted_at: string;
  details?: ExamResultDetail[] | null;
  exams?: { title: string; description?: string; subject_name?: string } | null;
};

function ExamSkillAnalysis({
  details,
  subjectName,
  skillMap,
}: {
  details: ExamResultDetail[];
  subjectName?: string;
  skillMap: Map<string, { skill_name: string; subject_name: string }>;
}) {
  const breakdown = computeExamSkillBreakdown(details, skillMap, subjectName);
  if (breakdown.length === 0) return null;

  const strengths = breakdown.filter((s) => s.mastery_pct >= 60).sort((a, b) => b.mastery_pct - a.mastery_pct);
  const weaknesses = breakdown.filter((s) => s.mastery_pct < 60);

  return (
    <div className="space-y-3 pt-2 border-t border-white/5">
      <p className="text-white/50 text-[10px]">تحليل المهارات</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {strengths.length > 0 && (
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-3 space-y-2">
            <p className="text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              نقاط قوة
            </p>
            <ul className="space-y-1.5">
              {strengths.map((s) => (
                <li key={s.skill_id} className="flex items-center justify-between text-[11px] text-white/70">
                  <span className="truncate ml-2">{s.skill_name}</span>
                  <span className="text-emerald-400 font-mono shrink-0">{s.correct}/{s.total}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {weaknesses.length > 0 && (
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3 space-y-2">
            <p className="text-amber-300 text-[10px] font-semibold flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              يحتاج مراجعة
            </p>
            <ul className="space-y-1.5">
              {weaknesses.map((s) => (
                <li key={s.skill_id} className="flex items-center justify-between text-[11px] text-white/70">
                  <span className="truncate ml-2">{s.skill_name}</span>
                  <span className="text-amber-400 font-mono shrink-0">{s.mastery_pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function ParentExamResultsPage() {
  const { children, isLoading: childrenLoading, selectedChild, selectedChildId, setSelectedChildId } = useParentChildren();

  const { data: skills = [] } = useQuery({
    queryKey: ['skills-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('skills').select('id, skill_name, subject_name');
      if (error) throw error;
      return data as DbSkill[];
    },
  });

  const skillMap = new Map(skills.map((s) => [s.id, { skill_name: s.skill_name, subject_name: s.subject_name }]));

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['parent', 'exam_results', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return [];
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams (
            title,
            description,
            subject_name
          )
        `)
        .eq('student_id', selectedChildId)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data as ExamResultRow[];
    },
    enabled: !!selectedChildId,
  });

  const isLoading = childrenLoading || resultsLoading;

  if (isLoading && children.length === 0) {
    return <BarsLoader label="جاري تحميل النتائج..." fullScreen />;
  }

  if (children.length === 0) {
    return (
      <ParentPageShell>
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-6 glass-card">
          <AlertCircle className="w-12 h-12 text-gold-400 mb-3" />
          <h2 className="text-white font-bold text-lg">لا يوجد أبناء مرتبطين بحسابك</h2>
          <p className="text-white/40 text-sm mt-1">يرجى مراجعة إدارة المدرسة لربط بيانات الأبناء بحساب ولي الأمر.</p>
        </div>
      </ParentPageShell>
    );
  }

  return (
    <ParentPageShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-gold-400" />
            نتائج الاختبارات الأكاديمية
          </h1>
          <p className="text-white/40 text-sm mt-1">تفاصيل النتائج مع تحليل نقاط القوة والضعف حسب المهارة</p>
        </div>

        <ParentChildSelector
          children={children}
          selectedChildId={selectedChildId}
          onChange={setSelectedChildId}
        />

        {selectedChild && (
          <div className="space-y-4">
            {results.length === 0 ? (
              <div className="glass-card p-8 text-center text-white/30 text-sm">
                لا توجد اختبارات مكتملة أو نتائج مسجلة للابن حالياً.
              </div>
            ) : (
              results.map((res) => {
                const percent = Math.round((res.score / res.max_score) * 100);
                const isPassed = percent >= 50;
                const details = res.details ?? [];
                const correctCount = details.length > 0
                  ? details.filter((d) => d.is_correct).length
                  : res.score;
                const wrongCount = res.max_score - correctCount;

                return (
                  <div key={res.id} className="glass-card p-6 space-y-4">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div>
                        <p className="text-cyan-400/70 text-[10px]">{res.exams?.subject_name ?? 'مادة'}</p>
                        <h3 className="text-white font-bold text-base">{res.exams?.title ?? 'اختبار'}</h3>
                        <p className="text-white/40 text-xs mt-1">{res.exams?.description ?? ''}</p>
                        <p className="text-white/30 text-[10px] mt-1">
                          تاريخ التقديم: {new Date(res.submitted_at).toLocaleString('ar-EG')}
                        </p>
                      </div>
                      <div className="text-left">
                        <span className={clsx('text-2xl font-bold block', isPassed ? 'text-emerald-400' : 'text-red-400')}>
                          {percent}%
                        </span>
                        <span className={clsx('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border mt-1',
                          isPassed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                        )}>
                          {isPassed ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {isPassed ? 'ناجح' : 'لم يجتز'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                        إجابات صحيحة: <strong>{correctCount}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
                        إجابات خاطئة: <strong>{wrongCount}</strong>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-white/60">
                        <span>الدرجة: <strong>{res.score}</strong> / {res.max_score}</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={clsx('h-full transition-all duration-500', isPassed ? 'bg-emerald-400' : 'bg-red-400')} style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    {details.length > 0 && (
                      <ExamSkillAnalysis
                        details={details}
                        subjectName={res.exams?.subject_name}
                        skillMap={skillMap}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </ParentPageShell>
  );
}
