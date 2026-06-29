import { supabase } from './supabase';
import { saveSchoolSetting } from './schoolConfig';
import type { ExamType } from './examAnalytics';
import { fetchActivityWeek, isActivityWeekActive, applyActivityWeekMultiplier } from './activityWeek';

export type ExamPointsBand = {
  min: number;
  max: number;
  points: number;
};

export type ExamPointsCalculationMode = 'bands' | 'per_correct' | 'fixed_pass';

export type ExamPointsPolicy = {
  enabled: boolean;
  exam_types: ExamType[];
  grades: string[];
  subjects: string[];
  min_percent: number;
  target_axis: 'activity' | 'behavior' | 'achievement' | 'initiative';
  activity_id: string | null;
  calculation_mode: ExamPointsCalculationMode;
  bands: ExamPointsBand[];
  per_correct_points: number;
  fixed_pass_points: number;
  pass_percent: number;
  max_per_exam: number;
  max_per_student_term: number;
  activity_week_multiplier: boolean;
  allow_edit_before_approve: boolean;
};

export const DEFAULT_EXAM_POINTS_POLICY: ExamPointsPolicy = {
  enabled: false,
  exam_types: ['formative', 'summative'],
  grades: [],
  subjects: [],
  min_percent: 50,
  target_axis: 'achievement',
  activity_id: null,
  calculation_mode: 'bands',
  bands: [
    { min: 90, max: 100, points: 25 },
    { min: 75, max: 89, points: 15 },
    { min: 60, max: 74, points: 10 },
  ],
  per_correct_points: 3,
  fixed_pass_points: 20,
  pass_percent: 60,
  max_per_exam: 30,
  max_per_student_term: 100,
  activity_week_multiplier: false,
  allow_edit_before_approve: true,
};

export const EXAM_TYPE_OPTIONS: { value: ExamType; label: string }[] = [
  { value: 'diagnostic', label: 'تشخيصي' },
  { value: 'formative', label: 'تكويني' },
  { value: 'summative', label: 'تحصيلي' },
  { value: 'adaptive', label: 'تكيّفي' },
];

export const AXIS_OPTIONS: { value: ExamPointsPolicy['target_axis']; label: string }[] = [
  { value: 'activity', label: 'النشاط' },
  { value: 'behavior', label: 'السلوك' },
  { value: 'achievement', label: 'الإنجاز' },
  { value: 'initiative', label: 'المبادرة' },
];

function parsePolicy(raw: Record<string, unknown>): ExamPointsPolicy {
  const bands = Array.isArray(raw.bands)
    ? (raw.bands as ExamPointsBand[]).map((b) => ({
        min: Number(b.min),
        max: Number(b.max),
        points: Number(b.points),
      }))
    : DEFAULT_EXAM_POINTS_POLICY.bands;

  const examTypes = Array.isArray(raw.exam_types)
    ? (raw.exam_types as ExamType[])
    : DEFAULT_EXAM_POINTS_POLICY.exam_types;

  return {
    enabled: Boolean(raw.enabled),
    exam_types: examTypes,
    grades: Array.isArray(raw.grades) ? (raw.grades as string[]) : [],
    subjects: Array.isArray(raw.subjects) ? (raw.subjects as string[]) : [],
    min_percent: Number(raw.min_percent ?? DEFAULT_EXAM_POINTS_POLICY.min_percent),
    target_axis: (raw.target_axis as ExamPointsPolicy['target_axis']) ?? 'achievement',
    activity_id: typeof raw.activity_id === 'string' ? raw.activity_id : null,
    calculation_mode:
      (raw.calculation_mode as ExamPointsCalculationMode) ?? 'bands',
    bands,
    per_correct_points: Number(raw.per_correct_points ?? 3),
    fixed_pass_points: Number(raw.fixed_pass_points ?? 20),
    pass_percent: Number(raw.pass_percent ?? 60),
    max_per_exam: Number(raw.max_per_exam ?? 30),
    max_per_student_term: Number(raw.max_per_student_term ?? 100),
    activity_week_multiplier: Boolean(raw.activity_week_multiplier),
    allow_edit_before_approve: raw.allow_edit_before_approve !== false,
  };
}

export async function fetchExamPointsPolicy(): Promise<ExamPointsPolicy> {
  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', 'exam_points_policy')
    .maybeSingle();

  if (error || !data?.value) return { ...DEFAULT_EXAM_POINTS_POLICY };
  return parsePolicy(data.value as Record<string, unknown>);
}

export async function saveExamPointsPolicy(policy: ExamPointsPolicy): Promise<void> {
  await saveSchoolSetting('exam_points_policy', policy);
}

export function calcExamProposedPoints(
  policy: ExamPointsPolicy,
  score: number,
  maxScore: number
): number {
  if (maxScore <= 0) return 0;
  const percent = (score / maxScore) * 100;
  if (percent < policy.min_percent) return 0;

  let points = 0;

  if (policy.calculation_mode === 'per_correct') {
    points = score * policy.per_correct_points;
  } else if (policy.calculation_mode === 'fixed_pass') {
    if (percent >= policy.pass_percent) {
      points = policy.fixed_pass_points;
    }
  } else {
    const band = policy.bands.find((b) => percent >= b.min && percent <= b.max);
    points = band?.points ?? 0;
  }

  if (policy.max_per_exam > 0) {
    points = Math.min(points, policy.max_per_exam);
  }

  return Math.max(0, Math.round(points));
}

export async function applyActivityWeekToExamPoints(
  points: number,
  policy: ExamPointsPolicy
): Promise<number> {
  if (!policy.activity_week_multiplier || points <= 0) return points;
  const week = await fetchActivityWeek();
  if (!isActivityWeekActive(week)) return points;
  let result = applyActivityWeekMultiplier(points, week);
  if (policy.max_per_exam > 0) {
    result = Math.min(result, policy.max_per_exam);
  }
  return result;
}

export function matchesExamPolicyScope(
  policy: ExamPointsPolicy,
  exam: {
    exam_type?: string | null;
    grade?: string | null;
    subject_name?: string | null;
  }
): boolean {
  const examType = (exam.exam_type ?? 'formative') as ExamType;
  if (!policy.exam_types.includes(examType)) return false;
  if (policy.grades.length > 0 && exam.grade && !policy.grades.includes(exam.grade)) {
    return false;
  }
  if (
    policy.subjects.length > 0 &&
    exam.subject_name &&
    !policy.subjects.includes(exam.subject_name)
  ) {
    return false;
  }
  return true;
}
