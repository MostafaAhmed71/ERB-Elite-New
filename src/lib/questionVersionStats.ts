import { supabase } from './supabase';
import { computeItemAnalysis } from './examAnalytics';
import type { DbQuestion } from '../types';

export type QuestionVersionStat = {
  questionId: string;
  versionNumber: number;
  questionText: string;
  pValue: number;
  totalAttempts: number;
  suggestion: string | null;
  isCurrent: boolean;
};

/** S8 — مقارنة أداء إصدارات السؤال */
export async function fetchQuestionVersionStats(
  question: DbQuestion,
): Promise<QuestionVersionStat[]> {
  const parentId = question.parent_question_id ?? question.id;

  const { data: versions, error: vErr } = await supabase
    .from('questions')
    .select('id, version_number, question_text')
    .or(`id.eq.${parentId},parent_question_id.eq.${parentId}`)
    .order('version_number');

  if (vErr) throw vErr;
  if (!versions?.length) return [];

  const ids = versions.map((v) => v.id);

  const { data: results, error: rErr } = await supabase
    .from('exam_results')
    .select('score, max_score, details');
  if (rErr) throw rErr;

  const relevant = (results ?? []).filter((r) => {
    const details = (r.details ?? []) as Array<{ question_id?: string }>;
    return details.some((d) => d.question_id && ids.includes(d.question_id));
  });

  const meta = new Map(
    versions.map((v) => [v.id, { text: v.question_text.slice(0, 80), skill_name: '—' }]),
  );

  return versions.map((v) => {
    const filtered = relevant.filter((r) => {
      const details = (r.details ?? []) as Array<{ question_id?: string }>;
      return details.some((d) => d.question_id === v.id);
    });

    const analysis = computeItemAnalysis(filtered, meta);
    const row = analysis.find((a) => a.question_id === v.id);

    return {
      questionId: v.id,
      versionNumber: v.version_number ?? 1,
      questionText: v.question_text,
      pValue: row?.p_value ?? 0,
      totalAttempts: row?.total_attempts ?? 0,
      suggestion: row?.suggestion ?? null,
      isCurrent: v.id === question.id,
    };
  });
}
