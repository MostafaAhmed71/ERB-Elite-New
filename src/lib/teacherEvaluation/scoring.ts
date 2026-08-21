import type {
  EvalSource,
  TeacherEvalCriterion,
  TeacherEvalScore,
  TeacherEvalSourceWeight,
  TeacherEvalSubmission,
  TeacherEvalDeduction,
} from './types';

export function starsToScore(stars: number, maxPoints: number): number {
  const clamped = Math.min(5, Math.max(1, stars));
  return Math.round((clamped / 5) * maxPoints * 100) / 100;
}

export function scoreFromInput(
  criterion: TeacherEvalCriterion,
  stars?: number | null,
  directScore?: number | null,
): number {
  if (criterion.scoring_mode === 'stars' && stars != null) {
    return starsToScore(stars, criterion.max_points);
  }
  if (directScore != null) {
    return Math.min(criterion.max_points, Math.max(0, directScore));
  }
  return 0;
}

export function maxTotalPoints(criteria: TeacherEvalCriterion[]): number {
  return criteria.filter((c) => c.is_active).reduce((s, c) => s + Number(c.max_points), 0);
}

/** مجموع درجات البنود لمقيّم واحد (من 100 افتراضياً) */
export function submissionTotalScore(
  scores: TeacherEvalScore[],
  criteria: TeacherEvalCriterion[],
  source: EvalSource,
): number {
  const active = criteria.filter((c) => c.is_active && c.allowed_sources.includes(source));
  if (!active.length) return 0;
  const byId = new Map(scores.map((s) => [s.criterion_id, s]));
  return active.reduce((sum, c) => sum + Number(byId.get(c.id)?.score ?? 0), 0);
}

/** متوسط تقييمات مصدر واحد (للطلاب/أولياء الأمور) — يُحتسب أي تقييم مُدخَل به درجات */
export function averageSourceScore(
  submissions: TeacherEvalSubmission[],
  allScores: TeacherEvalScore[],
  criteria: TeacherEvalCriterion[],
  source: EvalSource,
  teacherId: string,
): number | null {
  const subs = submissions.filter(
    (s) =>
      s.teacher_id === teacherId
      && s.source === source
      && allScores.some((sc) => sc.submission_id === s.id),
  );
  if (!subs.length) return null;
  const totals = subs.map((sub) => {
    const subScores = allScores.filter((sc) => sc.submission_id === sub.id);
    return submissionTotalScore(subScores, criteria, source);
  });
  return totals.reduce((a, b) => a + b, 0) / totals.length;
}

export function computeWeightedScore(
  sourceScores: Partial<Record<EvalSource, number | null>>,
  weights: TeacherEvalSourceWeight[],
): number {
  let total = 0;
  for (const w of weights) {
    const score = sourceScores[w.source];
    if (score != null) {
      total += score * (Number(w.weight_percent) / 100);
    }
  }
  return Math.round(total * 100) / 100;
}

export function totalDeductions(deductions: TeacherEvalDeduction[], teacherId: string): number {
  return deductions
    .filter((d) => d.teacher_id === teacherId)
    .reduce((s, d) => s + Number(d.points), 0);
}

export function analyzeStrengthsAndImprovements(
  criterionBreakdown: { title: string; avgScore: number; maxPoints: number }[],
  threshold = 0.75,
) {
  const withPct = criterionBreakdown.map((c) => ({
    title: c.title,
    score: c.avgScore,
    max: c.maxPoints,
    pct: c.maxPoints > 0 ? c.avgScore / c.maxPoints : 0,
  }));
  const strengths = withPct
    .filter((c) => c.pct >= threshold)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5)
    .map(({ title, score, max }) => ({ title, score, max }));
  const improvements = withPct
    .filter((c) => c.pct < threshold && c.max > 0)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5)
    .map(({ title, score, max }) => ({ title, score, max }));
  return { strengths, improvements };
}

export function monthLabelAr(year: number, month: number): string {
  try {
    return new Date(year, month - 1, 1).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
  } catch {
    return `${month}/${year}`;
  }
}

export function currentCycleKey(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** استخراج نص خطأ مقروء من أخطاء Supabase/PostgREST */
export function formatEvalError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const err = e as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [err.message, err.details, err.hint, err.code ? `(code: ${err.code})` : '']
      .filter(Boolean);
    if (parts.length) return parts.join(' — ');
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}
