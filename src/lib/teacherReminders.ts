import { supabase } from './supabase';
import {
  fetchTeacherClassAssignmentsByUserId,
  filterStudentsByAssignments,
} from './teacherScope';
import { weekStartIso, daysSince } from './operationalAlerts';

export type TeacherReminder = {
  id: string;
  type: 'no_grant_days' | 'students_without_points';
  severity: 'warning' | 'info';
  title: string;
  detail: string;
  actionPath?: string;
};

export async function fetchTeacherReminders(userId: string): Promise<TeacherReminder[]> {
  const weekStart = weekStartIso();
  const reminders: TeacherReminder[] = [];

  const [assignments, studentsRes, ledgerRes, lastGrantRes] = await Promise.all([
    fetchTeacherClassAssignmentsByUserId(userId),
    supabase.from('students').select('*').eq('is_active', true),
    supabase
      .from('points_ledger')
      .select('student_id, created_at')
      .eq('granted_by', userId)
      .gte('created_at', weekStart)
      .in('status', ['pending', 'approved']),
    supabase
      .from('points_ledger')
      .select('created_at')
      .eq('granted_by', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (studentsRes.error) throw studentsRes.error;
  if (ledgerRes.error) throw ledgerRes.error;
  if (lastGrantRes.error) throw lastGrantRes.error;

  const myStudents = filterStudentsByAssignments(studentsRes.data ?? [], assignments);
  const grantedStudentIds = new Set((ledgerRes.data ?? []).map((r) => r.student_id));

  const studentsWithoutPoints = myStudents.filter((s) => !grantedStudentIds.has(s.id));

  if (studentsWithoutPoints.length > 0) {
    const preview = studentsWithoutPoints
      .slice(0, 3)
      .map((s) => s.full_name)
      .join('، ');
    const more =
      studentsWithoutPoints.length > 3
        ? ` و${studentsWithoutPoints.length - 3} طلاب آخرين`
        : '';
    reminders.push({
      id: 'students-without-points',
      type: 'students_without_points',
      severity: studentsWithoutPoints.length >= 3 ? 'warning' : 'info',
      title: `${studentsWithoutPoints.length} طالب بلا نقاط هذا الأسبوع`,
      detail: `${preview}${more}`,
      actionPath: '/points/grant',
    });
  }

  const lastGrantAt = lastGrantRes.data?.created_at;
  if (!lastGrantAt) {
    reminders.push({
      id: 'no-grant-ever',
      type: 'no_grant_days',
      severity: 'warning',
      title: 'لم تمنح نقاطاً بعد',
      detail: 'ابدأ بملاحظة إيجابية فورية لطلابك — المنح السريع يحفّز الفصل',
      actionPath: '/points/grant',
    });
  } else {
    const days = daysSince(lastGrantAt);
    if (days >= 5) {
      reminders.push({
        id: 'no-grant-days',
        type: 'no_grant_days',
        severity: days >= 7 ? 'warning' : 'info',
        title: `لم تمنح نقاطاً منذ ${days} أيام`,
        detail: 'الملاحظة الفورية أقوى من التأجيل — استخدم مسح QR للسرعة',
        actionPath: '/points/grant',
      });
    }
  }

  return reminders;
}
