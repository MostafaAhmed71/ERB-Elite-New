export type EvalSource = 'principal' | 'deputy' | 'student' | 'parent' | 'self';
export type EvalScoringMode = 'stars' | 'points' | 'manual';
export type EvalCycleStatus = 'open' | 'closed';
export type EvalSubmissionStatus = 'draft' | 'submitted';

export interface TeacherEvalAxis {
  id: string;
  title: string;
  sort_order: number;
  is_active: boolean;
}

export interface TeacherEvalCriterion {
  id: string;
  axis_id: string;
  title: string;
  max_points: number;
  scoring_mode: EvalScoringMode;
  allowed_sources: EvalSource[];
  sort_order: number;
  is_active: boolean;
}

export interface TeacherEvalSourceWeight {
  source: EvalSource;
  weight_percent: number;
  label_ar: string;
}

export interface TeacherEvalDeductionType {
  id: string;
  title: string;
  default_points: number;
  is_automatic: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface TeacherEvalCycle {
  id: string;
  year: number;
  month: number;
  title: string | null;
  status: EvalCycleStatus;
  teacher_of_month_id: string | null;
  notes: string | null;
  created_at?: string;
  closed_at?: string | null;
}

export interface TeacherEvalSubmission {
  id: string;
  cycle_id: string;
  teacher_id: string;
  source: EvalSource;
  evaluator_id: string;
  status: EvalSubmissionStatus;
  notes: string | null;
  submitted_at: string | null;
}

export interface TeacherEvalScore {
  id?: string;
  submission_id?: string;
  criterion_id: string;
  score: number;
  stars: number | null;
  notes: string | null;
}

export interface TeacherEvalDeduction {
  id: string;
  cycle_id: string;
  teacher_id: string;
  deduction_type_id: string | null;
  title: string;
  points: number;
  reason: string | null;
  is_automatic: boolean;
  created_by: string | null;
  created_at?: string;
}

export interface CriterionScoreInput {
  criterion_id: string;
  stars?: number | null;
  score?: number | null;
  notes?: string | null;
}

export interface TeacherEvalResult {
  teacherId: string;
  teacherName: string;
  rank: number;
  sourceScores: Partial<Record<EvalSource, number>>;
  weightedScore: number;
  totalDeductions: number;
  finalScore: number;
  strengths: { title: string; score: number; max: number }[];
  improvements: { title: string; score: number; max: number }[];
  isTeacherOfMonth: boolean;
}

export interface TeacherEvalReport extends TeacherEvalResult {
  cycle: TeacherEvalCycle;
  criterionBreakdown: {
    criterionId: string;
    title: string;
    axisTitle: string;
    maxPoints: number;
    avgScore: number;
    percent: number;
  }[];
  monthlyHistory: { year: number; month: number; finalScore: number; rank: number }[];
}
