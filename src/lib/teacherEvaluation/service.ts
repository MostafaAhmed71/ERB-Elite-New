import { supabase } from '../supabase';
import { academicAdminService } from '../academic/adminService';
import type {
  CriterionScoreInput,
  EvalSource,
  TeacherEvalAxis,
  TeacherEvalCriterion,
  TeacherEvalCycle,
  TeacherEvalDeduction,
  TeacherEvalDeductionType,
  TeacherEvalReport,
  TeacherEvalResult,
  TeacherEvalScore,
  TeacherEvalSourceWeight,
  TeacherEvalSubmission,
} from './types';
import {
  analyzeStrengthsAndImprovements,
  averageSourceScore,
  computeWeightedScore,
  currentCycleKey,
  monthLabelAr,
  scoreFromInput,
  submissionTotalScore,
  totalDeductions,
} from './scoring';

const SOURCES: EvalSource[] = ['principal', 'deputy', 'student', 'parent', 'self'];

export const teacherEvaluationService = {
  async listAxes(): Promise<TeacherEvalAxis[]> {
    const { data, error } = await supabase
      .from('teacher_eval_axes')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data as TeacherEvalAxis[];
  },

  async saveAxis(axis: Partial<TeacherEvalAxis> & { title: string }) {
    if (axis.id) {
      const { data, error } = await supabase
        .from('teacher_eval_axes')
        .update({ title: axis.title, sort_order: axis.sort_order, is_active: axis.is_active })
        .eq('id', axis.id)
        .select()
        .single();
      if (error) throw error;
      return data as TeacherEvalAxis;
    }
    const { data, error } = await supabase
      .from('teacher_eval_axes')
      .insert({ title: axis.title, sort_order: axis.sort_order ?? 0, is_active: axis.is_active ?? true })
      .select()
      .single();
    if (error) throw error;
    return data as TeacherEvalAxis;
  },

  async listCriteria(): Promise<TeacherEvalCriterion[]> {
    const { data, error } = await supabase
      .from('teacher_eval_criteria')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return (data as TeacherEvalCriterion[]).map((c) => ({
      ...c,
      max_points: Number(c.max_points),
      allowed_sources: c.allowed_sources as EvalSource[],
    }));
  },

  async saveCriterion(criterion: Partial<TeacherEvalCriterion> & { axis_id: string; title: string; max_points: number }) {
    const payload = {
      axis_id: criterion.axis_id,
      title: criterion.title,
      max_points: criterion.max_points,
      scoring_mode: criterion.scoring_mode ?? 'stars',
      allowed_sources: criterion.allowed_sources ?? ['principal', 'deputy', 'self'],
      sort_order: criterion.sort_order ?? 0,
      is_active: criterion.is_active ?? true,
    };
    if (criterion.id) {
      const { data, error } = await supabase
        .from('teacher_eval_criteria')
        .update(payload)
        .eq('id', criterion.id)
        .select()
        .single();
      if (error) throw error;
      return data as TeacherEvalCriterion;
    }
    const { data, error } = await supabase.from('teacher_eval_criteria').insert(payload).select().single();
    if (error) throw error;
    return data as TeacherEvalCriterion;
  },

  async deleteCriterion(id: string) {
    const { error } = await supabase.from('teacher_eval_criteria').delete().eq('id', id);
    if (error) throw error;
  },

  async listSourceWeights(): Promise<TeacherEvalSourceWeight[]> {
    const { data, error } = await supabase.from('teacher_eval_source_weights').select('*');
    if (error) throw error;
    return (data as TeacherEvalSourceWeight[]).map((w) => ({
      ...w,
      weight_percent: Number(w.weight_percent),
    }));
  },

  async saveSourceWeights(weights: TeacherEvalSourceWeight[]) {
    const { error } = await supabase.from('teacher_eval_source_weights').upsert(
      weights.map((w) => ({
        source: w.source,
        weight_percent: w.weight_percent,
        label_ar: w.label_ar,
      })),
    );
    if (error) throw error;
  },

  async listDeductionTypes(): Promise<TeacherEvalDeductionType[]> {
    const { data, error } = await supabase
      .from('teacher_eval_deduction_types')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return (data as TeacherEvalDeductionType[]).map((d) => ({
      ...d,
      default_points: Number(d.default_points),
    }));
  },

  async saveDeductionType(row: Partial<TeacherEvalDeductionType> & { title: string; default_points: number }) {
    const payload = {
      title: row.title,
      default_points: row.default_points,
      is_automatic: row.is_automatic ?? false,
      sort_order: row.sort_order ?? 0,
      is_active: row.is_active ?? true,
    };
    if (row.id) {
      const { data, error } = await supabase
        .from('teacher_eval_deduction_types')
        .update(payload)
        .eq('id', row.id)
        .select()
        .single();
      if (error) throw error;
      return data as TeacherEvalDeductionType;
    }
    const { data, error } = await supabase.from('teacher_eval_deduction_types').insert(payload).select().single();
    if (error) throw error;
    return data as TeacherEvalDeductionType;
  },

  async listCycles(): Promise<TeacherEvalCycle[]> {
    const { data, error } = await supabase
      .from('teacher_eval_cycles')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    if (error) throw error;
    return data as TeacherEvalCycle[];
  },

  async getOrCreateCurrentCycle(): Promise<TeacherEvalCycle> {
    const { year, month } = currentCycleKey();
    const title = monthLabelAr(year, month);

    const { data: existing } = await supabase
      .from('teacher_eval_cycles')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();
    if (existing) return existing as TeacherEvalCycle;

    const { data, error } = await supabase.rpc('ensure_teacher_eval_cycle', {
      p_year: year,
      p_month: month,
      p_title: title,
    });
    if (!error && data) return data as TeacherEvalCycle;

    // توافق خلفي إن لم تُنفَّذ الهجرة بعد: المدير فقط يستطيع الإدراج المباشر
    const { data: inserted, error: insertErr } = await supabase
      .from('teacher_eval_cycles')
      .insert({ year, month, title, status: 'open' })
      .select()
      .single();
    if (insertErr) {
      if (error) {
        throw new Error(
          'تعذّر إنشاء دورة التقييم — نفّذ ترحيل 080_ensure_teacher_eval_cycle.sql أو سجّل دخول كمدير لإنشائها مرة واحدة',
        );
      }
      throw insertErr;
    }
    return inserted as TeacherEvalCycle;
  },

  async getCycle(id: string): Promise<TeacherEvalCycle | null> {
    const { data, error } = await supabase.from('teacher_eval_cycles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as TeacherEvalCycle | null;
  },

  async closeCycle(cycleId: string, teacherOfMonthId?: string | null) {
    const { data, error } = await supabase
      .from('teacher_eval_cycles')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        teacher_of_month_id: teacherOfMonthId ?? null,
      })
      .eq('id', cycleId)
      .select()
      .single();
    if (error) throw error;
    return data as TeacherEvalCycle;
  },

  async setTeacherOfMonth(cycleId: string, teacherId: string | null) {
    const { data, error } = await supabase
      .from('teacher_eval_cycles')
      .update({ teacher_of_month_id: teacherId })
      .eq('id', cycleId)
      .select()
      .single();
    if (error) throw error;
    return data as TeacherEvalCycle;
  },

  async listSubmissions(cycleId: string): Promise<TeacherEvalSubmission[]> {
    const { data, error } = await supabase
      .from('teacher_eval_submissions')
      .select('*')
      .eq('cycle_id', cycleId);
    if (error) throw error;
    return data as TeacherEvalSubmission[];
  },

  async listScoresForCycle(cycleId: string): Promise<TeacherEvalScore[]> {
    const subs = await this.listSubmissions(cycleId);
    if (!subs.length) return [];
    const ids = subs.map((s) => s.id);
    const { data, error } = await supabase
      .from('teacher_eval_scores')
      .select('*')
      .in('submission_id', ids);
    if (error) throw error;
    return (data as TeacherEvalScore[]).map((s) => ({ ...s, score: Number(s.score) }));
  },

  async listDeductions(cycleId: string): Promise<TeacherEvalDeduction[]> {
    const { data, error } = await supabase
      .from('teacher_eval_deductions')
      .select('*')
      .eq('cycle_id', cycleId);
    if (error) throw error;
    return (data as TeacherEvalDeduction[]).map((d) => ({ ...d, points: Number(d.points) }));
  },

  async addDeduction(row: {
    cycle_id: string;
    teacher_id: string;
    deduction_type_id?: string | null;
    title: string;
    points: number;
    reason?: string;
    created_by?: string;
  }) {
    const { data, error } = await supabase
      .from('teacher_eval_deductions')
      .insert({
        ...row,
        is_automatic: false,
      })
      .select()
      .single();
    if (error) throw error;
    return data as TeacherEvalDeduction;
  },

  async deleteDeduction(id: string) {
    const { error } = await supabase.from('teacher_eval_deductions').delete().eq('id', id);
    if (error) throw error;
  },

  async getOrCreateSubmission(params: {
    cycleId: string;
    teacherId: string;
    source: EvalSource;
    evaluatorId: string;
  }): Promise<TeacherEvalSubmission> {
    const { cycleId, teacherId, source, evaluatorId } = params;
    const { data: existing } = await supabase
      .from('teacher_eval_submissions')
      .select('*')
      .eq('cycle_id', cycleId)
      .eq('teacher_id', teacherId)
      .eq('source', source)
      .eq('evaluator_id', evaluatorId)
      .maybeSingle();
    if (existing) return existing as TeacherEvalSubmission;

    const { data, error } = await supabase
      .from('teacher_eval_submissions')
      .insert({
        cycle_id: cycleId,
        teacher_id: teacherId,
        source,
        evaluator_id: evaluatorId,
        status: 'draft',
      })
      .select()
      .single();
    if (error) throw error;
    return data as TeacherEvalSubmission;
  },

  async getSubmissionScores(submissionId: string): Promise<TeacherEvalScore[]> {
    const { data, error } = await supabase
      .from('teacher_eval_scores')
      .select('*')
      .eq('submission_id', submissionId);
    if (error) throw error;
    return (data as TeacherEvalScore[]).map((s) => ({ ...s, score: Number(s.score) }));
  },

  async saveSubmissionDraft(
    submissionId: string,
    scores: CriterionScoreInput[],
    criteria: TeacherEvalCriterion[],
    notes?: string,
  ) {
    const criterionMap = new Map(criteria.map((c) => [c.id, c]));
    for (const input of scores) {
      const criterion = criterionMap.get(input.criterion_id);
      if (!criterion) continue;
      const score = scoreFromInput(criterion, input.stars, input.score);
      const { error } = await supabase.from('teacher_eval_scores').upsert(
        {
          submission_id: submissionId,
          criterion_id: input.criterion_id,
          score,
          stars: input.stars ?? null,
          notes: input.notes ?? null,
        },
        { onConflict: 'submission_id,criterion_id' },
      );
      if (error) throw error;
    }
    if (notes !== undefined) {
      const { error } = await supabase
        .from('teacher_eval_submissions')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', submissionId);
      if (error) throw error;
    }
  },

  async submitEvaluation(submissionId: string) {
    const { data, error } = await supabase
      .from('teacher_eval_submissions')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select()
      .single();
    if (error) throw error;
    return data as TeacherEvalSubmission;
  },

  async computeLeaderboard(cycleId: string): Promise<TeacherEvalResult[]> {
    const [cycle, teachers, criteria, weights, submissions, scores, deductions, axes] = await Promise.all([
      this.getCycle(cycleId),
      academicAdminService.listTeachers(),
      this.listCriteria(),
      this.listSourceWeights(),
      this.listSubmissions(cycleId),
      this.listScoresForCycle(cycleId),
      this.listDeductions(cycleId),
      this.listAxes(),
    ]);
    if (!cycle) return [];

    const axisMap = new Map(axes.map((a) => [a.id, a.title]));
    const activeCriteria = criteria.filter((c) => c.is_active);

    const results: TeacherEvalResult[] = teachers.map((t) => {
      const sourceScores: Partial<Record<EvalSource, number>> = {};
      for (const source of SOURCES) {
        if (source === 'student' || source === 'parent') {
          const avg = averageSourceScore(submissions, scores, activeCriteria, source, t.id);
          if (avg != null) sourceScores[source] = Math.round(avg * 100) / 100;
        } else {
          const sub = submissions.find(
            (s) =>
              s.teacher_id === t.id
              && s.source === source
              && scores.some((sc) => sc.submission_id === s.id),
          );
          if (sub) {
            const subScores = scores.filter((sc) => sc.submission_id === sub.id);
            sourceScores[source] = submissionTotalScore(subScores, activeCriteria, source);
          }
        }
      }
      const weightedScore = computeWeightedScore(sourceScores, weights);
      const ded = totalDeductions(deductions, t.id);
      const finalScore = Math.max(0, Math.round((weightedScore - ded) * 100) / 100);

      const criterionBreakdown = activeCriteria.map((c) => {
        const relevantSubs = submissions.filter(
          (s) =>
            s.teacher_id === t.id
            && c.allowed_sources.includes(s.source)
            && scores.some((sc) => sc.submission_id === s.id),
        );
        let avgScore = 0;
        if (relevantSubs.length) {
          const vals = relevantSubs.map((sub) => {
            const sc = scores.find((x) => x.submission_id === sub.id && x.criterion_id === c.id);
            return Number(sc?.score ?? 0);
          });
          avgScore = vals.reduce((a, b) => a + b, 0) / vals.length;
        }
        return {
          title: c.title,
          axisTitle: axisMap.get(c.axis_id) ?? '',
          avgScore,
          maxPoints: Number(c.max_points),
        };
      });

      const { strengths, improvements } = analyzeStrengthsAndImprovements(criterionBreakdown);

      return {
        teacherId: t.id,
        teacherName: t.full_name,
        rank: 0,
        sourceScores,
        weightedScore,
        totalDeductions: ded,
        finalScore,
        strengths,
        improvements,
        isTeacherOfMonth: cycle.teacher_of_month_id === t.id,
      };
    });

    results.sort((a, b) => b.finalScore - a.finalScore);
    results.forEach((r, i) => {
      r.rank = i + 1;
    });
    return results;
  },

  async getTeacherReport(cycleId: string, teacherId: string): Promise<TeacherEvalReport | null> {
    const [cycle, criteria, axes, submissions, scores, weights, deductions, leaderboard, allCycles] =
      await Promise.all([
        this.getCycle(cycleId),
        this.listCriteria(),
        this.listAxes(),
        this.listSubmissions(cycleId),
        this.listScoresForCycle(cycleId),
        this.listSourceWeights(),
        this.listDeductions(cycleId),
        this.computeLeaderboard(cycleId),
        this.listCycles(),
      ]);
    const base = leaderboard.find((r) => r.teacherId === teacherId);
    if (!cycle || !base) return null;

    const axisMap = new Map(axes.map((a) => [a.id, a.title]));
    const activeCriteria = criteria.filter((c) => c.is_active);

    const criterionBreakdown = activeCriteria.map((c) => {
      const relevantSubs = submissions.filter(
        (s) =>
          s.teacher_id === teacherId
          && c.allowed_sources.includes(s.source)
          && scores.some((sc) => sc.submission_id === s.id),
      );
      let avgScore = 0;
      if (relevantSubs.length) {
        const vals = relevantSubs.map((sub) => {
          const sc = scores.find((x) => x.submission_id === sub.id && x.criterion_id === c.id);
          return Number(sc?.score ?? 0);
        });
        avgScore = vals.reduce((a, b) => a + b, 0) / vals.length;
      }
      const maxPoints = Number(c.max_points);
      return {
        criterionId: c.id,
        title: c.title,
        axisTitle: axisMap.get(c.axis_id) ?? '',
        maxPoints,
        avgScore: Math.round(avgScore * 100) / 100,
        percent: maxPoints > 0 ? Math.round((avgScore / maxPoints) * 100) : 0,
      };
    });

    const monthlyHistory: TeacherEvalReport['monthlyHistory'] = [];
    for (const c of allCycles.filter((x) => x.status === 'closed').slice(0, 12)) {
      const lb = await this.computeLeaderboard(c.id);
      const row = lb.find((r) => r.teacherId === teacherId);
      if (row) {
        monthlyHistory.push({ year: c.year, month: c.month, finalScore: row.finalScore, rank: row.rank });
      }
    }

    return {
      ...base,
      cycle,
      criterionBreakdown,
      monthlyHistory,
    };
  },
};
