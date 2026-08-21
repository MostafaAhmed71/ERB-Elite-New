import { supabase } from '../supabase';
import type { AcademicEducationLevel } from './types';
import { gradeBelongsToEducationLevel } from './stageScope';
import { gradesMatch, classesMatch } from './gradeBridge';
import { sendWhatsAppText, normalizePhoneDigits } from '../whatsappReminder';

export type AttendanceDayStatus = 'present' | 'absent';

export type ClassKey = { grade: string; class_name: string };

export type ClassAttendanceSession = {
  id: string;
  attendance_date: string;
  grade: string;
  class_name: string;
  education_level: AcademicEducationLevel;
  recorded_by: string | null;
  present_count: number;
  absent_count: number;
  late_count: number;
  student_count: number;
  updated_at: string;
  recorder_name?: string | null;
};

export type ClassDayStatus = ClassKey & {
  student_count: number;
  done: boolean;
  session?: ClassAttendanceSession | null;
};

export async function fetchStageClassKeys(
  level: AcademicEducationLevel,
): Promise<(ClassKey & { student_count: number })[]> {
  const { data, error } = await supabase
    .from('students')
    .select('grade, class_name')
    .eq('is_active', true);
  if (error) throw error;

  const map = new Map<string, { grade: string; class_name: string; student_count: number }>();
  for (const row of data ?? []) {
    if (!gradeBelongsToEducationLevel(row.grade, level)) continue;
    const grade = row.grade?.trim();
    const class_name = row.class_name?.trim();
    if (!grade || !class_name) continue;
    const key = `${grade}__${class_name}`;
    const cur = map.get(key);
    if (cur) cur.student_count += 1;
    else map.set(key, { grade, class_name, student_count: 1 });
  }
  return Array.from(map.values()).sort((a, b) =>
    a.grade.localeCompare(b.grade, 'ar') || a.class_name.localeCompare(b.class_name, 'ar'),
  );
}

export async function fetchClassSessionsForDate(date: string, level?: AcademicEducationLevel | null) {
  let q = supabase
    .from('attendance_class_sessions')
    .select('*')
    .eq('attendance_date', date)
    .order('grade');
  if (level) q = q.eq('education_level', level);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ClassAttendanceSession[];
}

export async function fetchClassDayStatuses(
  level: AcademicEducationLevel,
  date: string,
): Promise<ClassDayStatus[]> {
  const [classes, sessions] = await Promise.all([
    fetchStageClassKeys(level),
    fetchClassSessionsForDate(date, level),
  ]);

  const recorderIds = [...new Set(sessions.map((s) => s.recorded_by).filter(Boolean))] as string[];
  let nameById = new Map<string, string>();
  if (recorderIds.length > 0) {
    const { data } = await supabase.from('users').select('id, full_name').in('id', recorderIds);
    nameById = new Map((data ?? []).map((u) => [u.id, u.full_name]));
  }

  return classes.map((c) => {
    const session = sessions.find(
      (s) => gradesMatch(s.grade, c.grade) && classesMatch(s.class_name, c.class_name),
    );
    return {
      ...c,
      done: !!session,
      session: session
        ? { ...session, recorder_name: session.recorded_by ? nameById.get(session.recorded_by) ?? null : null }
        : null,
    };
  });
}

/** كل المراحل — للمدير */
export async function fetchSchoolDayAttendanceOverview(date: string) {
  const { data: students, error } = await supabase
    .from('students')
    .select('grade, class_name')
    .eq('is_active', true);
  if (error) throw error;

  const classMap = new Map<string, ClassKey & { student_count: number; level: AcademicEducationLevel }>();
  for (const row of students ?? []) {
    const grade = row.grade?.trim();
    const class_name = row.class_name?.trim();
    if (!grade || !class_name) continue;
    const level: AcademicEducationLevel = /ثان/i.test(grade) ? 'high' : 'middle';
    if (!gradeBelongsToEducationLevel(grade, level)) continue;
    const key = `${grade}__${class_name}`;
    const cur = classMap.get(key);
    if (cur) cur.student_count += 1;
    else classMap.set(key, { grade, class_name, student_count: 1, level });
  }

  const sessions = await fetchClassSessionsForDate(date);
  const recorderIds = [...new Set(sessions.map((s) => s.recorded_by).filter(Boolean))] as string[];
  let nameById = new Map<string, string>();
  if (recorderIds.length > 0) {
    const { data } = await supabase.from('users').select('id, full_name').in('id', recorderIds);
    nameById = new Map((data ?? []).map((u) => [u.id, u.full_name]));
  }

  const rows = Array.from(classMap.values())
    .map((c) => {
      const session = sessions.find(
        (s) => gradesMatch(s.grade, c.grade) && classesMatch(s.class_name, c.class_name),
      );
      return {
        ...c,
        done: !!session,
        session: session
          ? {
              ...session,
              recorder_name: session.recorded_by ? nameById.get(session.recorded_by) ?? null : null,
            }
          : null,
      };
    })
    .sort((a, b) => a.grade.localeCompare(b.grade, 'ar') || a.class_name.localeCompare(b.class_name, 'ar'));

  const done = rows.filter((r) => r.done);
  const pending = rows.filter((r) => !r.done);
  const absentTotal = done.reduce((sum, r) => sum + (r.session?.absent_count ?? 0), 0);

  return { rows, done, pending, absentTotal, totalClasses: rows.length };
}

export async function fetchClassStudents(grade: string, className: string) {
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, admission_number, grade, class_name')
    .eq('is_active', true)
    .eq('grade', grade)
    .eq('class_name', className)
    .order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchExistingClassAttendance(
  date: string,
  studentIds: string[],
): Promise<Record<string, AttendanceDayStatus>> {
  if (studentIds.length === 0) return {};
  const { data, error } = await supabase
    .from('attendance')
    .select('student_id, status')
    .eq('date', date)
    .in('student_id', studentIds);
  if (error) throw error;
  const map: Record<string, AttendanceDayStatus> = {};
  for (const row of data ?? []) {
    map[row.student_id] = row.status === 'absent' ? 'absent' : 'present';
  }
  return map;
}

export async function saveClassDailyAttendance(opts: {
  date: string;
  grade: string;
  className: string;
  educationLevel: AcademicEducationLevel;
  records: { student_id: string; status: AttendanceDayStatus }[];
}) {
  const { data, error } = await supabase.rpc('save_class_daily_attendance', {
    p_date: opts.date,
    p_grade: opts.grade,
    p_class_name: opts.className,
    p_education_level: opts.educationLevel,
    p_records: opts.records,
  });
  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('LEVEL_MISMATCH')) throw new Error('هذه المرحلة غير مطابقة لملفك');
    if (msg.includes('CLASS_REQUIRED')) throw new Error('اختر الصف والفصل');
    if (msg.includes('RECORDS_REQUIRED') || msg.includes('NO_STUDENTS_SAVED')) {
      throw new Error('لا طلاب للحفظ في هذا الفصل');
    }
    if (msg.includes('FORBIDDEN')) throw new Error('ليست لديك صلاحية تسجيل الغياب');
    throw error;
  }
  return data as { ok: boolean; present: number; absent: number; total: number };
}

export function buildDeputyAttendanceReminderMessage(
  deputyName: string,
  dateLabel: string,
  pendingClasses: ClassKey[],
): string {
  const list = pendingClasses
    .slice(0, 20)
    .map((c) => `• ${c.grade} / ${c.class_name}`)
    .join('\n');
  const more =
    pendingClasses.length > 20 ? `\n… و${pendingClasses.length - 20} فصلاً أخرى` : '';
  return (
    `السلام عليكم ${deputyName}،\n\n` +
    `تذكير من إدارة المدرسة:\n` +
    `لم يُسجَّل *الغياب اليومي* (${dateLabel}) للفصول التالية في مرحلتك:\n\n` +
    `${list}${more}\n\n` +
    `يرجى التسجيل من التطبيق — شاشة الحضور والغياب.\n\n` +
    `شكراً لتعاونكم 🌟`
  );
}

export async function remindDeputiesPendingAttendance(opts: {
  date: string;
  level?: AcademicEducationLevel | null;
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  const overview = opts.level
    ? {
        pending: (await fetchClassDayStatuses(opts.level, opts.date)).filter((c) => !c.done),
      }
    : await fetchSchoolDayAttendanceOverview(opts.date);

  const pending = overview.pending;
  if (pending.length === 0) return { sent: 0, failed: 0, errors: [] };

  const levels = opts.level
    ? [opts.level]
    : ([...new Set(pending.map((p) => ('level' in p ? p.level : 'middle')))] as AcademicEducationLevel[]);

  let q = supabase
    .from('users')
    .select('id, full_name, phone, staff_education_level')
    .eq('role', 'deputy')
    .eq('is_active', true);
  if (opts.level) q = q.eq('staff_education_level', opts.level);

  const { data: deputies, error } = await q;
  if (error) throw error;

  const dateLabel = new Date(opts.date + 'T12:00:00').toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const dep of deputies ?? []) {
    const depLevel = (dep.staff_education_level ?? null) as AcademicEducationLevel | null;
    if (!depLevel || !levels.includes(depLevel)) continue;
    const depPending = pending.filter((p) => {
      const lvl = 'level' in p ? (p as { level: AcademicEducationLevel }).level : opts.level;
      return lvl === depLevel;
    });
    if (depPending.length === 0) continue;
    const phone = dep.phone?.trim();
    if (!phone || normalizePhoneDigits(phone).length < 12) {
      failed += 1;
      errors.push(`${dep.full_name}: لا يوجد جوال`);
      continue;
    }
    const msg = buildDeputyAttendanceReminderMessage(
      dep.full_name ?? 'الوكيل',
      dateLabel,
      depPending,
    );
    const res = await sendWhatsAppText(phone, msg);
    if (res.ok) sent += 1;
    else {
      failed += 1;
      errors.push(`${dep.full_name}: ${res.error || 'فشل الإرسال'}`);
    }
  }

  return { sent, failed, errors };
}
