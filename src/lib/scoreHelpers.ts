import { supabase } from './supabase';
import {
  getApprovedPointsTotal,
  getFinalScore,
  type PointEntry,
  type AxisWeights,
  DEFAULT_AXIS_WEIGHTS,
} from './calculations';
import {
  computeAttendanceScore,
  groupAttendanceByStudent,
  type AttendanceRecord,
} from './attendanceScore';
import { fetchAxisWeights } from './schoolConfig';

export async function fetchAttendanceScoresByStudent(
  studentIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (studentIds.length === 0) return result;

  const { data, error } = await supabase
    .from('attendance')
    .select('student_id, status')
    .in('student_id', studentIds);

  if (error) throw error;

  const grouped = groupAttendanceByStudent(
    (data ?? []).map((r) => ({
      student_id: r.student_id,
      status: r.status as AttendanceRecord['status'],
      date: '',
    }))
  );

  for (const id of studentIds) {
    result.set(id, computeAttendanceScore(grouped.get(id) ?? []));
  }
  return result;
}

export function computeStudentApprovedTotal(entries: PointEntry[]): number {
  return getApprovedPointsTotal(entries);
}

/** درجة موزونة — للتقارير الإدارية فقط */
export function computeStudentFinalScore(
  entries: PointEntry[],
  attendanceScore: number,
  weights: AxisWeights = DEFAULT_AXIS_WEIGHTS
): number {
  return getFinalScore(entries, weights, attendanceScore);
}

export async function loadAxisWeights(): Promise<AxisWeights> {
  try {
    return await fetchAxisWeights();
  } catch {
    return DEFAULT_AXIS_WEIGHTS;
  }
}
