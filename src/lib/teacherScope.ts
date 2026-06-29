import { supabase } from './supabase';
import type { DbStudent, DbTeacher } from '../types';

export type TeacherClassAssignment = {
  id?: string;
  teacher_id?: string;
  grade: string;
  class_name: string;
  academic_year?: string;
};

export type TeacherBudgetInfo = {
  teacher: DbTeacher;
  remaining: number;
  level: 'ok' | 'low' | 'critical' | 'depleted';
};

export type TeacherQuotaInfo = {
  dailyLimit: number | null;
  weeklyLimit: number | null;
  dailyUsed: number;
  weeklyUsed: number;
  dailyRemaining: number | null;
  weeklyRemaining: number | null;
};

const LOW_BUDGET_THRESHOLD = 20;
const CRITICAL_BUDGET_THRESHOLD = 5;

export function getBudgetLevel(remaining: number): TeacherBudgetInfo['level'] {
  if (remaining <= 0) return 'depleted';
  if (remaining <= CRITICAL_BUDGET_THRESHOLD) return 'critical';
  if (remaining <= LOW_BUDGET_THRESHOLD) return 'low';
  return 'ok';
}

export async function fetchTeacherProfile(userId: string): Promise<DbTeacher | null> {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as DbTeacher | null;
}

export async function fetchTeacherBudget(userId: string): Promise<TeacherBudgetInfo | null> {
  const teacher = await fetchTeacherProfile(userId);
  if (!teacher) return null;

  const remaining = teacher.points_budget;
  return {
    teacher,
    remaining,
    level: getBudgetLevel(remaining),
  };
}

function periodStart(period: 'day' | 'week'): string {
  const now = new Date();
  if (period === 'day') {
    now.setHours(0, 0, 0, 0);
  } else {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    now.setDate(now.getDate() - diff);
    now.setHours(0, 0, 0, 0);
  }
  return now.toISOString();
}

export async function fetchTeacherQuotaUsage(userId: string): Promise<TeacherQuotaInfo | null> {
  const teacher = await fetchTeacherProfile(userId);
  if (!teacher) return null;

  const dayStart = periodStart('day');
  const weekStart = periodStart('week');

  const [{ data: dayRows }, { data: weekRows }] = await Promise.all([
    supabase
      .from('points_ledger')
      .select('points')
      .eq('granted_by', userId)
      .gt('points', 0)
      .in('status', ['pending', 'approved'])
      .gte('created_at', dayStart),
    supabase
      .from('points_ledger')
      .select('points')
      .eq('granted_by', userId)
      .gt('points', 0)
      .in('status', ['pending', 'approved'])
      .gte('created_at', weekStart),
  ]);

  const dailyUsed = (dayRows ?? []).reduce((s, r) => s + r.points, 0);
  const weeklyUsed = (weekRows ?? []).reduce((s, r) => s + r.points, 0);

  return {
    dailyLimit: teacher.daily_points_limit,
    weeklyLimit: teacher.weekly_points_limit,
    dailyUsed,
    weeklyUsed,
    dailyRemaining:
      teacher.daily_points_limit != null
        ? Math.max(0, teacher.daily_points_limit - dailyUsed)
        : null,
    weeklyRemaining:
      teacher.weekly_points_limit != null
        ? Math.max(0, teacher.weekly_points_limit - weeklyUsed)
        : null,
  };
}

export async function fetchTeacherClassAssignments(teacherId: string): Promise<TeacherClassAssignment[]> {
  const { data, error } = await supabase
    .from('teacher_classes')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('grade')
    .order('class_name');

  if (error) throw error;
  return (data ?? []) as TeacherClassAssignment[];
}

export async function fetchTeacherClassAssignmentsByUserId(userId: string): Promise<TeacherClassAssignment[]> {
  const teacher = await fetchTeacherProfile(userId);
  if (!teacher) return [];
  return fetchTeacherClassAssignments(teacher.id);
}

export async function saveTeacherClassAssignments(
  teacherId: string,
  assignments: Pick<TeacherClassAssignment, 'grade' | 'class_name'>[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('teacher_classes')
    .delete()
    .eq('teacher_id', teacherId);

  if (deleteError) throw deleteError;

  if (assignments.length === 0) return;

  const academicYear = new Date().getFullYear().toString();
  const rows = assignments.map((a) => ({
    teacher_id: teacherId,
    grade: a.grade,
    class_name: a.class_name,
    academic_year: academicYear,
  }));

  const { error: insertError } = await supabase.from('teacher_classes').insert(rows);
  if (insertError) throw insertError;
}

export function filterStudentsByAssignments(
  students: DbStudent[],
  assignments: TeacherClassAssignment[]
): DbStudent[] {
  if (assignments.length === 0) return [];

  const keys = new Set(assignments.map((a) => `${a.grade}__${a.class_name}`));
  return students.filter((s) => keys.has(`${s.grade}__${s.class_name}`));
}

export function assignmentKey(grade: string, className: string): string {
  return `${grade}__${className}`;
}

export function toggleAssignment(
  assignments: Pick<TeacherClassAssignment, 'grade' | 'class_name'>[],
  grade: string,
  className: string
): Pick<TeacherClassAssignment, 'grade' | 'class_name'>[] {
  const key = assignmentKey(grade, className);
  const exists = assignments.some((a) => assignmentKey(a.grade, a.class_name) === key);
  if (exists) {
    return assignments.filter((a) => assignmentKey(a.grade, a.class_name) !== key);
  }
  return [...assignments, { grade, class_name: className }];
}

export function isAssignmentSelected(
  assignments: Pick<TeacherClassAssignment, 'grade' | 'class_name'>[],
  grade: string,
  className: string
): boolean {
  return assignments.some(
    (a) => a.grade === grade && a.class_name === className
  );
}

export function formatTeacherClasses(assignments: TeacherClassAssignment[]): string {
  if (assignments.length === 0) return 'لم يُسند أي فصل بعد';
  return assignments.map((a) => `${a.grade} — ${a.class_name}`).join('، ');
}

export function parsePointsGrantError(message: string): string {
  if (message.includes('TEACHER_STUDENT_NOT_ASSIGNED') || message.includes('خارج فصولك')) {
    return 'لا يمكن منح نقاط لطالب خارج فصولك المسندة';
  }
  if (message.includes('INSUFFICIENT_BUDGET') || message.includes('رصيد النقاط غير كاف')) {
    const match = message.match(/المتبقي:\s*(\d+)/);
    return match
      ? `رصيد النقاط غير كافٍ. المتبقي: ${match[1]} نقطة`
      : 'رصيد النقاط غير كافٍ لإتمام هذه العملية';
  }
  if (message.includes('TEACHER_PROFILE_MISSING')) {
    return 'ملف المعلم غير مكتمل. تواصل مع الإدارة';
  }
  if (message.includes('DAILY_LIMIT_EXCEEDED') || message.includes('الحد اليومي')) {
    const match = message.match(/المتبقي:\s*(\d+)/);
    return match
      ? `تجاوزت الحد اليومي للمنح. المتبقي: ${match[1]} نقطة`
      : 'تجاوزت الحد اليومي لمنح النقاط';
  }
  if (message.includes('WEEKLY_LIMIT_EXCEEDED') || message.includes('الحد الأسبوعي')) {
    const match = message.match(/المتبقي:\s*(\d+)/);
    return match
      ? `تجاوزت الحد الأسبوعي للمنح. المتبقي: ${match[1]} نقطة`
      : 'تجاوزت الحد الأسبوعي لمنح النقاط';
  }
  if (message.includes('BEHAVIOR_WEEKLY_CAP') || message.includes('سقف نقاط السلوك')) {
    const match = message.match(/المتبقي:\s*(\d+)/);
    return match
      ? `تجاوز الطالب سقف نقاط السلوك الأسبوعي. المتبقي: ${match[1]} نقطة`
      : 'تجاوز الطالب سقف نقاط السلوك الأسبوعي';
  }
  if (message.includes('ACTIVITY_TERM_LIMIT')) {
    return 'تم الوصول للحد الأقصى لمنح هذا النشاط للطالب في العام الدراسي';
  }
  return message;
}
