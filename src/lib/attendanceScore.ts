import type { AttendanceStatus } from '../types';

const STATUS_POINTS: Record<AttendanceStatus, number> = {
  present: 100,
  late: 60,
  absent: 0,
};

export type AttendanceRecord = {
  status: AttendanceStatus;
  date?: string;
};

/** يحسب درجة الحضور على مقياس 0–100 */
export function computeAttendanceScore(records: AttendanceRecord[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((sum, r) => sum + STATUS_POINTS[r.status], 0);
  return Math.round(total / records.length);
}

export function attendanceRatePct(records: AttendanceRecord[]): number {
  if (records.length === 0) return 0;
  const present = records.filter((r) => r.status === 'present').length;
  const late = records.filter((r) => r.status === 'late').length;
  return Math.round(((present + late * 0.5) / records.length) * 100);
}

export function summarizeAttendance(records: AttendanceRecord[]) {
  return {
    total: records.length,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
    score: computeAttendanceScore(records),
    ratePct: attendanceRatePct(records),
  };
}

/** حضور وغياب فقط — المتأخر يُحسب ضمن الحضور */
export function simpleAttendanceCounts(records: AttendanceRecord[]) {
  const summary = summarizeAttendance(records);
  return {
    present: summary.present + summary.late,
    absent: summary.absent,
  };
}

/** تجميع سجلات الحضور حسب student_id */
export function groupAttendanceByStudent(
  rows: Array<{ student_id: string; status: AttendanceStatus; date: string }>
): Map<string, AttendanceRecord[]> {
  const map = new Map<string, AttendanceRecord[]>();
  for (const row of rows) {
    if (!map.has(row.student_id)) map.set(row.student_id, []);
    map.get(row.student_id)!.push({ status: row.status, date: row.date });
  }
  return map;
}
