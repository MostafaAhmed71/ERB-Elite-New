import type { DbExamResult, DbSkill, ExamResultDetail } from '../types';

export type ExamType = 'diagnostic' | 'formative' | 'summative' | 'adaptive';

export interface SkillWeakness {
  skill_id: string;
  skill_name: string;
  subject_name: string;
  mastery_pct: number;
  wrong: number;
  total: number;
}

export interface GradeBucket {
  label: string;
  min: number;
  max: number;
  count: number;
  /** مستوى عربي */
  level: string;
  color: string;
}

const BUCKET_DEFS = [
  { label: '0–39%', min: 0, max: 39, level: 'ضعيف', color: '#EE5D50' },
  { label: '40–59%', min: 40, max: 59, level: 'مقبول', color: '#f0b429' },
  { label: '60–79%', min: 60, max: 79, level: 'جيد', color: '#4481EB' },
  { label: '80–100%', min: 80, max: 100, level: 'ممتاز', color: '#01B574' },
] as const;

export type ClassScoreStats = {
  median: number;
  passRate: number;
  excellenceRate: number;
  min: number;
  max: number;
};

/** توزيع درجات الفصل (نطاقات) */
export function computeGradeDistribution(pcts: number[]): GradeBucket[] {
  const buckets: GradeBucket[] = BUCKET_DEFS.map((d) => ({ ...d, count: 0 }));
  for (const p of pcts) {
    const b = buckets.find((x) => p >= x.min && p <= x.max);
    if (b) b.count++;
  }
  return buckets;
}

export function computeClassScoreStats(pcts: number[]): ClassScoreStats | null {
  if (pcts.length === 0) return null;
  const sorted = [...pcts].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  return {
    median,
    passRate: Math.round((pcts.filter((p) => p >= 60).length / pcts.length) * 100),
    excellenceRate: Math.round((pcts.filter((p) => p >= 80).length / pcts.length) * 100),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}
export interface ItemAnalysisRow {
  question_id: string;
  question_text: string;
  skill_name: string;
  p_value: number;
  discrimination: number;
  total_attempts: number;
  suggestion: string | null;
}

export interface CompetencyCell {
  skill_id: string;
  skill_name: string;
  subject_name: string;
  mastery_pct: number;
  students_count: number;
}

export interface GrowthRow {
  student_id: string;
  student_name: string;
  subject_name: string;
  diagnostic_pct: number | null;
  summative_pct: number | null;
  growth_pts: number | null;
  trend: 'up' | 'down' | 'flat' | 'insufficient';
}

export interface ExamTimelinePoint {
  exam_id: string;
  title: string;
  subject_name: string;
  submitted_at: string;
  pct: number;
  exam_type: ExamType;
}

/** استنتاج نوع الاختبار من العنوان إن لم يُخزَّن */
export function inferExamType(title: string, stored?: string | null): ExamType {
  if (stored && ['diagnostic', 'formative', 'summative', 'adaptive'].includes(stored)) {
    return stored as ExamType;
  }
  const t = title.toLowerCase();
  if (t.includes('تشخيص')) return 'diagnostic';
  if (t.includes('تكيف')) return 'adaptive';
  if (t.includes('نهائي') || t.includes('تحصيل')) return 'summative';
  return 'formative';
}

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  diagnostic: 'تشخيصي',
  formative: 'تكويني',
  summative: 'تحصيلي',
  adaptive: 'تكيفي',
};

export function pct(score: number, max: number): number {
  return max > 0 ? Math.round((Number(score) / max) * 100) : 0;
}

export type ExamSkillBreakdownRow = {
  skill_id: string;
  skill_name: string;
  subject_name: string;
  correct: number;
  total: number;
  mastery_pct: number;
};

/** تحليل مهارات اختبار واحد لولي الأمر / الطالب */
export function computeExamSkillBreakdown(
  details: ExamResultDetail[],
  skillMap: Map<string, { skill_name: string; subject_name: string }>,
  fallbackSubject?: string,
): ExamSkillBreakdownRow[] {
  const stats: Record<string, { correct: number; total: number }> = {};

  for (const d of details) {
    const key = d.skill_id || '__subject__';
    if (!stats[key]) stats[key] = { correct: 0, total: 0 };
    stats[key].total++;
    if (d.is_correct) stats[key].correct++;
  }

  return Object.entries(stats)
    .map(([skillId, { correct, total }]) => {
      const skill = skillId === '__subject__' ? null : skillMap.get(skillId);
      const mastery_pct = total > 0 ? Math.round((correct / total) * 100) : 0;
      return {
        skill_id: skillId,
        skill_name: skill?.skill_name ?? fallbackSubject ?? 'المادة',
        subject_name: skill?.subject_name ?? fallbackSubject ?? '—',
        correct,
        total,
        mastery_pct,
      };
    })
    .sort((a, b) => a.mastery_pct - b.mastery_pct);
}

/** مهارات بها ضعف (إتقان أقل من 60%) */
export function computeStudentWeaknesses(
  results: Pick<DbExamResult, 'details'>[],
  skills: DbSkill[],
): SkillWeakness[] {
  const skillMap = new Map(skills.map((s) => [s.id, s]));
  const stats: Record<string, { correct: number; total: number }> = {};

  for (const res of results) {
    for (const d of (res.details ?? []) as ExamResultDetail[]) {
      if (!stats[d.skill_id]) stats[d.skill_id] = { correct: 0, total: 0 };
      stats[d.skill_id].total++;
      if (d.is_correct) stats[d.skill_id].correct++;
    }
  }

  return Object.entries(stats)
    .map(([skillId, { correct, total }]) => {
      const skill = skillMap.get(skillId);
      const mastery_pct = total > 0 ? Math.round((correct / total) * 100) : 0;
      return {
        skill_id: skillId,
        skill_name: skill?.skill_name ?? 'مهارة غير معروفة',
        subject_name: skill?.subject_name ?? '—',
        mastery_pct,
        wrong: total - correct,
        total,
      };
    })
    .filter((s) => s.mastery_pct < 60)
    .sort((a, b) => a.mastery_pct - b.mastery_pct);
}

/**
 * تحليل نفسومتري مبسّط لكل سؤال
 * p-value = نسبة الإجابة الصحيحة
 * discrimination = فرق نسبة النجاح بين الربع الأعلى والربع الأدنى
 */
export function computeItemAnalysis(
  results: Pick<DbExamResult, 'score' | 'max_score' | 'details'>[],
  questionMeta: Map<string, { text: string; skill_name: string }>,
): ItemAnalysisRow[] {
  const byQuestion: Record<
    string,
    { correct: number; total: number; topCorrect: number; topTotal: number; bottomCorrect: number; bottomTotal: number }
  > = {};

  const ranked = results
    .filter((r) => r.max_score > 0)
    .map((r) => ({ ...r, pct: pct(Number(r.score), r.max_score) }))
    .sort((a, b) => b.pct - a.pct);

  const topCut = Math.max(1, Math.ceil(ranked.length * 0.25));
  const bottomCut = Math.max(1, Math.ceil(ranked.length * 0.25));
  const topStudentIdx = new Set(ranked.slice(0, topCut).map((_, i) => i));
  const bottomStudentIdx = new Set(
    ranked.slice(Math.max(0, ranked.length - bottomCut)).map((_, i) => ranked.length - bottomCut + i)
  );

  ranked.forEach((res, idx) => {
    const inTop = topStudentIdx.has(idx);
    const inBottom = bottomStudentIdx.has(idx);
    for (const d of (res.details ?? []) as ExamResultDetail[]) {
      if (!byQuestion[d.question_id]) {
        byQuestion[d.question_id] = {
          correct: 0,
          total: 0,
          topCorrect: 0,
          topTotal: 0,
          bottomCorrect: 0,
          bottomTotal: 0,
        };
      }
      const q = byQuestion[d.question_id];
      q.total++;
      if (d.is_correct) q.correct++;
      if (inTop) {
        q.topTotal++;
        if (d.is_correct) q.topCorrect++;
      }
      if (inBottom) {
        q.bottomTotal++;
        if (d.is_correct) q.bottomCorrect++;
      }
    }
  });

  return Object.entries(byQuestion)
    .map(([question_id, s]) => {
      const p_value = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      const topRate = s.topTotal > 0 ? s.topCorrect / s.topTotal : 0;
      const bottomRate = s.bottomTotal > 0 ? s.bottomCorrect / s.bottomTotal : 0;
      const discrimination = Math.round((topRate - bottomRate) * 100) / 100;
      const meta = questionMeta.get(question_id);
      let suggestion: string | null = null;
      if (s.total >= 5) {
        if (p_value > 90) suggestion = 'السؤال سهل جداً — يُنصح برفع الصعوبة أو استبداله';
        else if (p_value < 25) suggestion = 'السؤال صعب جداً — راجع الصياغة أو المهارة';
        else if (discrimination < 0.15) suggestion = 'تمييز ضعيف — السؤال لا يفرّق بين الطلاب';
      }
      return {
        question_id,
        question_text: meta?.text ?? 'سؤال',
        skill_name: meta?.skill_name ?? '—',
        p_value,
        discrimination,
        total_attempts: s.total,
        suggestion,
      };
    })
    .sort((a, b) => a.p_value - b.p_value);
}

/** خريطة إتقان مهارات صف ومادة محددين */
export function computeCompetencyHeatmap(
  results: Pick<DbExamResult, 'details' | 'student_id'>[],
  skills: DbSkill[],
): CompetencyCell[] {
  if (skills.length === 0) return [];

  const skillIds = new Set(skills.map((s) => s.id));
  const stats: Record<string, { correct: number; total: number; students: Set<string> }> = {};

  for (const skill of skills) {
    stats[skill.id] = { correct: 0, total: 0, students: new Set() };
  }

  for (const res of results) {
    for (const d of (res.details ?? []) as ExamResultDetail[]) {
      if (!skillIds.has(d.skill_id)) continue;
      const entry = stats[d.skill_id];
      entry.total++;
      entry.students.add(res.student_id);
      if (d.is_correct) entry.correct++;
    }
  }

  return skills
    .map((skill) => {
      const s = stats[skill.id];
      return {
        skill_id: skill.id,
        skill_name: skill.skill_name,
        subject_name: skill.subject_name,
        mastery_pct: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        students_count: s.students.size,
      };
    })
    .sort((a, b) => a.mastery_pct - b.mastery_pct);
}

/** تقرير النمو: تشخيصي vs تحصيلي لكل طالب ومادة */
export function computeGrowthReport(
  results: Array<
    Pick<DbExamResult, 'student_id' | 'score' | 'max_score'> & {
      exams: { title: string; subject_name: string | null; exam_type?: string | null } | null;
    }
  >,
  studentNames: Map<string, string>,
): GrowthRow[] {
  const map = new Map<string, { diagnostic: number[]; summative: number[]; subject: string }>();

  for (const r of results) {
    const subject = r.exams?.subject_name ?? '—';
    const type = inferExamType(r.exams?.title ?? '', r.exams?.exam_type);
    const key = `${r.student_id}__${subject}`;
    if (!map.has(key)) map.set(key, { diagnostic: [], summative: [], subject });
    const entry = map.get(key)!;
    const p = pct(Number(r.score), r.max_score);
    if (type === 'diagnostic') entry.diagnostic.push(p);
    else if (type === 'summative') entry.summative.push(p);
  }

  const rows: GrowthRow[] = [];
  for (const [key, v] of map) {
    const student_id = key.split('__')[0];
    const avg = (arr: number[]) =>
      arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const diagnostic_pct = avg(v.diagnostic);
    const summative_pct = avg(v.summative);
    let growth_pts: number | null = null;
    let trend: GrowthRow['trend'] = 'insufficient';
    if (diagnostic_pct !== null && summative_pct !== null) {
      growth_pts = summative_pct - diagnostic_pct;
      trend = growth_pts > 5 ? 'up' : growth_pts < -5 ? 'down' : 'flat';
    }
    rows.push({
      student_id,
      student_name: studentNames.get(student_id) ?? 'طالب',
      subject_name: v.subject,
      diagnostic_pct,
      summative_pct,
      growth_pts,
      trend,
    });
  }
  return rows.sort((a, b) => (b.growth_pts ?? -999) - (a.growth_pts ?? -999));
}

/** خط زمني لأداء طالب عبر الاختبارات */
export function buildStudentExamTimeline(
  results: Array<
    Pick<DbExamResult, 'exam_id' | 'score' | 'max_score' | 'submitted_at'> & {
      exams: { title: string; subject_name: string | null; exam_type?: string | null } | null;
    }
  >,
): ExamTimelinePoint[] {
  return results
    .filter((r) => r.max_score > 0)
    .map((r) => ({
      exam_id: r.exam_id,
      title: r.exams?.title ?? 'اختبار',
      subject_name: r.exams?.subject_name ?? '—',
      submitted_at: r.submitted_at,
      pct: pct(Number(r.score), r.max_score),
      exam_type: inferExamType(r.exams?.title ?? '', r.exams?.exam_type),
    }))
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
}

/** مسار تعلم مقترح لمهارات ضعيفة */
export function suggestLearningPath(weaknesses: SkillWeakness[]): string[] {
  return weaknesses.slice(0, 5).map((w, i) => {
    const action =
      w.mastery_pct < 30 ? 'مراجعة مكثفة + تمارين إضافية' : 'مراجعة موجّهة + أمثلة محلولة';
    return `${i + 1}. ${w.skill_name} (${w.subject_name}): ${action}`;
  });
}
