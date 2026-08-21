import { useMemo } from 'react';
import { computeAttendanceScore } from './attendanceScore';

export type PrincipalStudentRating = {
  examPct: number | null;
  attendanceScore: number;
  /** تقييم شامل 0–100 (اختبارات 60% + حضور 40%) */
  overall: number | null;
  label: string;
};

export function computePrincipalStudentRating(
  exams: Array<{ score: number; max_score: number }>,
  attendance: Array<{ status: 'present' | 'absent' | 'late' }>
): PrincipalStudentRating {
  const examPct =
    exams.length > 0
      ? Math.round(
          exams.reduce((sum, e) => sum + (e.max_score > 0 ? (e.score / e.max_score) * 100 : 0), 0) /
            exams.length
        )
      : null;

  const attendanceScore = computeAttendanceScore(attendance);

  let overall: number | null = null;
  let label = 'لا يوجد تقييم';

  if (examPct != null && attendance.length > 0) {
    overall = Math.round(examPct * 0.6 + attendanceScore * 0.4);
    label = 'أكاديمي + حضور';
  } else if (examPct != null) {
    overall = examPct;
    label = 'أكاديمي';
  } else if (attendance.length > 0) {
    overall = attendanceScore;
    label = 'حضور';
  }

  return { examPct, attendanceScore, overall, label };
}

export function ratingColor(score: number | null): string {
  if (score == null) return 'text-white/40';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}

export function ratingBadgeClass(score: number | null): string {
  if (score == null) return 'bg-white/5 text-white/40 border-white/10';
  if (score >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (score >= 60) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-red-500/10 text-red-400 border-red-500/20';
}
