import type { QueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { groupAttendanceByStudent, type AttendanceRecord } from './attendanceScore';
import type { AttendanceStatus } from '../types';

/** تاريخ محلي YYYY-MM-DD (بدون انزياح UTC) */
export function localDateString(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const ATTENDANCE_QUERY_KEYS = {
  daily: (date: string) => ['attendance', date] as const,
  report: (since: string, gradeFilter: string) =>
    ['admin', 'attendance-report', since, gradeFilter] as const,
  all: ['admin', 'attendance-report'] as const,
};

export function invalidateAttendanceQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['attendance'] });
  queryClient.invalidateQueries({ queryKey: ATTENDANCE_QUERY_KEYS.all });
}

const ATTENDANCE_IN_CHUNK = 80;

/** جلب سجلات حضور لمجموعة طلاب (داخل نفس استعلام التقرير) */
export async function fetchAttendanceForStudents(
  studentIds: string[],
): Promise<Map<string, AttendanceRecord[]>> {
  if (studentIds.length === 0) return new Map();

  const rows: Array<{ student_id: string; status: AttendanceStatus; date: string }> = [];

  for (let i = 0; i < studentIds.length; i += ATTENDANCE_IN_CHUNK) {
    const chunk = studentIds.slice(i, i + ATTENDANCE_IN_CHUNK);
    const { data, error } = await supabase
      .from('attendance')
      .select('student_id, status, date')
      .in('student_id', chunk);
    if (error) throw error;
    rows.push(...(data ?? []));
  }

  return groupAttendanceByStudent(rows);
}
