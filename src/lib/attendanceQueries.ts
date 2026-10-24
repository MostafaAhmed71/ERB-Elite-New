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
const ATTENDANCE_PAGE = 1000;
const DASHBOARD_LOOKBACK_DAYS = 30;

/** سجلات الحضور منذ تاريخ معيّن — صفحات 1000 حتى لا يُقطع PostgREST ولا يُجلب الأرشيف كاملاً */
export async function fetchAttendanceSince<T extends Record<string, unknown> = {
  student_id: string;
  status: AttendanceStatus;
  date: string;
}>(
  daysBack: number,
  columns = 'student_id, status, date',
): Promise<T[]> {
  const since = localDateString(daysBack);
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('attendance')
      .select(columns)
      .gte('date', since)
      .order('date', { ascending: false })
      .range(from, from + ATTENDANCE_PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as T[];
    rows.push(...page);
    if (page.length < ATTENDANCE_PAGE) break;
    from += ATTENDANCE_PAGE;
  }

  return rows;
}

export { DASHBOARD_LOOKBACK_DAYS };

export type ClassDayAttendance = {
  date: string;
  status: AttendanceStatus;
  isRecorded: boolean;
  note: string | null;
};

/** أيام الفصل التي سُجّل فيها أي زميل + حالة الطالب (غياب إن لم يُرصد) */
export async function fetchStudentClassAttendanceCalendar(
  studentId: string,
  daysBack = 180,
): Promise<ClassDayAttendance[]> {
  const { data, error } = await supabase.rpc('student_class_attendance_calendar', {
    p_student_id: studentId,
    p_days_back: daysBack,
  });

  if (!error && data) {
    return (data as Array<{
      attendance_date: string;
      status: AttendanceStatus;
      is_recorded: boolean;
      note: string | null;
    }>).map((row) => ({
      date: row.attendance_date,
      status: row.status,
      isRecorded: row.is_recorded,
      note: row.note,
    }));
  }

  const { data: rows, error: fallbackErr } = await supabase
    .from('attendance')
    .select('date, status, note')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
    .limit(daysBack);
  if (fallbackErr) throw fallbackErr;

  return (rows ?? []).map((row) => ({
    date: row.date as string,
    status: row.status as AttendanceStatus,
    isRecorded: true,
    note: (row.note as string | null) ?? null,
  }));
}

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
