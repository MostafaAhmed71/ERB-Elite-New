import { supabase } from './supabase';
import type { DbStudent, DbTeacher } from '../types';
import {
  classesMatch,
  gradesMatch,
  normalizeClassName,
  normalizeGradeLabel,
} from './academic/gradeBridge';
import { syncTeacherOlympiadFromAcademic, buildOlympiadSyncPayload } from './academic/olympiadSyncService';

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

/**
 * BUG-008: يحسب بداية الفترة بتوقيت السعودية (Asia/Riyadh) لضمان
 * تطابق حدود اليوم والأسبوع بغض النظر عن موقع المعلم.
 */
function periodStart(period: 'day' | 'week'): string {
  const TZ = 'Asia/Riyadh';
  const now = new Date();

  // احصل على المكونات الزمنية بتوقيت الرياض
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short',
  }).formatToParts(now);

  const year  = Number(parts.find(p => p.type === 'year')!.value);
  const month = Number(parts.find(p => p.type === 'month')!.value) - 1;
  const day   = Number(parts.find(p => p.type === 'day')!.value);
  const weekday = parts.find(p => p.type === 'weekday')!.value; // 'Sun'..'Sat'

  if (period === 'day') {
    // منتصف ليل يوم اليوم بتوقيت الرياض = UTC-3
    const riyadhMidnight = new Date(Date.UTC(year, month, day) - (3 * 60 * 60 * 1000));
    return riyadhMidnight.toISOString();
  } else {
    // بداية الأسبوع = الأحد (day=0) بتوقيت السعودية
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const currentWeekday = weekdayMap[weekday] ?? 0;
    const daysBack = currentWeekday; // الأحد = 0 تراجع
    const riyadhWeekStart = new Date(
      Date.UTC(year, month, day - daysBack) - (3 * 60 * 60 * 1000)
    );
    return riyadhWeekStart.toISOString();
  }
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

export async function fetchTeacherClassAssignmentsByUserId(
  userId: string,
  options?: { syncIfEmpty?: boolean },
): Promise<TeacherClassAssignment[]> {
  const syncIfEmpty = options?.syncIfEmpty !== false;

  let teacher = await fetchTeacherProfile(userId);
  let assignments = teacher ? await fetchTeacherClassAssignments(teacher.id) : [];

  if (assignments.length > 0) return assignments;
  if (!syncIfEmpty) return [];

  // مزامنة تلقائية من الإعداد/الإسناد الأكاديمي
  try {
    const sync = await syncTeacherOlympiadFromAcademic(userId);
    teacher = await fetchTeacherProfile(userId);
    if (teacher) {
      assignments = await fetchTeacherClassAssignments(teacher.id);
      if (assignments.length > 0) return assignments;
    }

    // إن فشلت الكتابة (RPC قديمة) — استخدم الحمولة الأكاديمية كتعيينات مؤقتة للواجهة
    if (sync.reason === 'rpc_missing' || sync.reason === 'empty_payload') {
      const payload = await buildOlympiadSyncPayload(userId);
      if (payload.classes.length > 0) {
        return payload.classes.map((c) => ({
          grade: c.grade,
          class_name: c.class_name,
        }));
      }
    }
  } catch (e) {
    console.warn('auto sync teacher classes:', e);
    try {
      const payload = await buildOlympiadSyncPayload(userId);
      if (payload.classes.length > 0) {
        return payload.classes.map((c) => ({
          grade: c.grade,
          class_name: c.class_name,
        }));
      }
    } catch {
      /* ignore */
    }
  }

  return assignments;
}

export async function saveTeacherClassAssignments(
  teacherId: string,
  assignments: Pick<TeacherClassAssignment, 'grade' | 'class_name'>[]
): Promise<void> {
  const academicYear = new Date().getFullYear().toString();

  // BUG-009: 1. استخدام RPC الذري لتنفيذ الحذف والإدراج في Transaction واحدة
  const { error: rpcError } = await supabase.rpc('set_teacher_class_assignments', {
    p_teacher_id: teacherId,
    p_assignments: assignments.map((a) => ({
      grade: a.grade,
      class_name: a.class_name,
      academic_year: academicYear,
    })),
    p_academic_year: academicYear,
  });

  if (!rpcError) return;

  // 2. Fallback في حال عدم توفر الـ RPC بعد في قاعدة البيانات
  const { error: deleteError } = await supabase
    .from('teacher_classes')
    .delete()
    .eq('teacher_id', teacherId);

  if (deleteError) throw deleteError;

  if (assignments.length === 0) return;

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

  const keys = new Set(
    assignments.map(
      (a) => `${normalizeGradeLabel(a.grade)}__${normalizeClassName(a.class_name)}`,
    ),
  );
  return students.filter((s) =>
    keys.has(`${normalizeGradeLabel(s.grade)}__${normalizeClassName(s.class_name)}`),
  );
}

/** درجات المعلم من التعيينات فقط (بدون كتالوج المدرسة كاملاً) */
export function gradesFromAssignments(assignments: TeacherClassAssignment[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of assignments) {
    const n = normalizeGradeLabel(a.grade);
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(a.grade);
  }
  return out.sort((a, b) => a.localeCompare(b, 'ar'));
}

/** فصول المعلم لصف معيّن من التعيينات فقط */
export function classesFromAssignments(
  assignments: TeacherClassAssignment[],
  grade: string,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of assignments) {
    if (!gradesMatch(a.grade, grade)) continue;
    const n = normalizeClassName(a.class_name);
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(a.class_name);
  }
  return out.sort((a, b) => a.localeCompare(b, 'ar'));
}

export function assignmentKey(grade: string, className: string): string {
  return `${normalizeGradeLabel(grade)}__${normalizeClassName(className)}`;
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
    (a) => gradesMatch(a.grade, grade) && classesMatch(a.class_name, className),
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
  if (message.includes('DEPUTY_STUDENT_NOT_IN_LEVEL') || message.includes('خارج مرحلتك')) {
    return 'لا يمكن منح نقاط لطالب خارج مرحلتك التعليمية';
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
  if (message.includes('ACTIVITY_TERM_LIMIT') || message.includes('الحد الأقصى لمنح')) {
    return 'لا يمكن تجاوز الحد الأقصى لمرات منح هذا النشاط لهذا الطالب في العام الدراسي (يمكن للإدارة تعديل الحد من إعدادات البرنامج > سياسة النقاط، أو تطبيق ترحيل 142 للأنشطة اليدوية)';
  }
  if (
    message.includes('evidence_urls') ||
    message.includes('PGRST204') ||
    message.includes('schema cache')
  ) {
    return 'فشل تسجيل النقاط: عمود الشواهد غير متزامن مع قاعدة البيانات. طبّق ترحيل النشاط اليدوي (116) ثم أعد المحاولة';
  }
  if (message.includes('foreign key') || message.includes('activity_id') || message.includes('activities')) {
    return 'فشل تسجيل النقاط: نشاط المنح اليدوي غير موجود. شغّل ملف supabase/fix-ensure-manual-teacher-activity.sql في Supabase ثم أعد المحاولة';
  }
  if (message.includes('points_ledger') && message.includes('42501')) {
    return 'ليس لديك صلاحية تسجيل النقاط. تأكد أن دورك رائد نشاط أو معلم مخوّل';
  }
  return message;
}
