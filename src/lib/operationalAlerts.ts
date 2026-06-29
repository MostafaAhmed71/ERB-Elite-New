import { supabase } from './supabase';
import { buildPendingInsights } from './pointsAnalytics';

export type ClassRef = { grade: string; class_name: string };

export type OperationalAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  actionLabel?: string;
  actionPath?: string;
};

export function classRefKey(grade: string, class_name: string): string {
  return `${grade}__${class_name}`;
}

export function weekStartIso(now = new Date()): string {
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function daysSince(iso: string, now = new Date()): number {
  const start = new Date(iso);
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - start.getTime()) / 86_400_000);
}

export function findClassesWithoutPointsThisWeek(
  students: ClassRef[],
  ledgerRows: Array<{ student_id: string }>,
  studentClassMap: Map<string, ClassRef>,
): ClassRef[] {
  const allClasses = new Map<string, ClassRef>();
  for (const s of students) {
    allClasses.set(classRefKey(s.grade, s.class_name), s);
  }

  const active = new Set<string>();
  for (const row of ledgerRows) {
    const cls = studentClassMap.get(row.student_id);
    if (cls) active.add(classRefKey(cls.grade, cls.class_name));
  }

  return [...allClasses.values()].filter(
    (c) => !active.has(classRefKey(c.grade, c.class_name)),
  );
}

export function findTeachersWithoutGrantsThisWeek(
  teachers: Array<{ id: string; full_name: string }>,
  grantedByThisWeek: Set<string>,
): Array<{ id: string; full_name: string }> {
  return teachers.filter((t) => !grantedByThisWeek.has(t.id));
}

export function formatClassLabel(c: ClassRef): string {
  return `${c.grade} — ${c.class_name}`;
}

export function buildOperationalAlerts(input: {
  pendingCount: number;
  oldestPendingDays: number | null;
  inactiveClasses: ClassRef[];
  inactiveTeachers: Array<{ full_name: string }>;
  pendingThreshold?: number;
}): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const threshold = input.pendingThreshold ?? 10;

  if (input.pendingCount >= threshold) {
    alerts.push({
      id: 'pending-high',
      severity: input.pendingCount >= threshold * 2 ? 'critical' : 'warning',
      title: `${input.pendingCount} طلب نقاط معلّق`,
      detail: 'يحتاج اعتماد رائد النشاط قبل الطابور',
      actionLabel: 'مراجعة الطلبات',
      actionPath: '/admin/points',
    });
  }

  if (input.oldestPendingDays !== null && input.oldestPendingDays >= 2) {
    alerts.push({
      id: 'pending-old',
      severity: input.oldestPendingDays >= 5 ? 'critical' : 'warning',
      title: `أقدم طلب معلّق منذ ${input.oldestPendingDays} يوم`,
      detail: 'تأخير الاعتماد يؤثر على تحفيز الطلاب',
      actionLabel: 'اعتماد الآن',
      actionPath: '/admin/points',
    });
  }

  if (input.inactiveClasses.length > 0) {
    const preview = input.inactiveClasses
      .slice(0, 3)
      .map(formatClassLabel)
      .join('، ');
    const more =
      input.inactiveClasses.length > 3
        ? ` و${input.inactiveClasses.length - 3} فصول أخرى`
        : '';
    alerts.push({
      id: 'classes-inactive',
      severity: input.inactiveClasses.length >= 3 ? 'warning' : 'info',
      title: `${input.inactiveClasses.length} فصل بلا نقاط هذا الأسبوع`,
      detail: `${preview}${more}`,
      actionLabel: 'تقرير الفصول',
      actionPath: '/admin/classes-report',
    });
  }

  if (input.inactiveTeachers.length > 0) {
    const preview = input.inactiveTeachers
      .slice(0, 3)
      .map((t) => t.full_name)
      .join('، ');
    const more =
      input.inactiveTeachers.length > 3
        ? ` و${input.inactiveTeachers.length - 3} معلمين آخرين`
        : '';
    alerts.push({
      id: 'teachers-inactive',
      severity: input.inactiveTeachers.length >= 5 ? 'warning' : 'info',
      title: `${input.inactiveTeachers.length} معلم لم يمنح نقاطاً هذا الأسبوع`,
      detail: `${preview}${more}`,
      actionLabel: 'تقرير المعلمين',
      actionPath: '/admin/teachers-report',
    });
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export async function fetchOperationalAlertData() {
  const weekStart = weekStartIso();

  const [studentsRes, ledgerRes, teachersRes, pendingRes] = await Promise.all([
    supabase.from('students').select('id, grade, class_name').eq('is_active', true),
    supabase
      .from('points_ledger')
      .select('student_id, granted_by, status, created_at, points, granted_by_user:granted_by(full_name)')
      .gte('created_at', weekStart)
      .in('status', ['pending', 'approved']),
    supabase
      .from('users')
      .select('id, full_name')
      .eq('role', 'teacher')
      .eq('is_active', true),
    supabase
      .from('points_ledger')
      .select('points, status, created_at, granted_by_user:granted_by(full_name)'),
  ]);

  if (studentsRes.error) throw studentsRes.error;
  if (ledgerRes.error) throw ledgerRes.error;
  if (teachersRes.error) throw teachersRes.error;
  if (pendingRes.error) throw pendingRes.error;

  const students = studentsRes.data ?? [];
  const ledgerWeek = ledgerRes.data ?? [];
  const teachers = teachersRes.data ?? [];

  const studentClassMap = new Map<string, ClassRef>();
  for (const s of students) {
    studentClassMap.set(s.id, { grade: s.grade, class_name: s.class_name });
  }

  const grantedByThisWeek = new Set(
    ledgerWeek.map((r) => r.granted_by).filter(Boolean) as string[],
  );

  const inactiveClasses = findClassesWithoutPointsThisWeek(
    students.map((s) => ({ grade: s.grade, class_name: s.class_name })),
    ledgerWeek,
    studentClassMap,
  );

  const inactiveTeachers = findTeachersWithoutGrantsThisWeek(teachers, grantedByThisWeek);

  const pendingInsights = buildPendingInsights(
    (pendingRes.data ?? []) as unknown as Parameters<typeof buildPendingInsights>[0],
  );

  const alerts = buildOperationalAlerts({
    pendingCount: pendingInsights.pendingCount,
    oldestPendingDays: pendingInsights.oldestDays,
    inactiveClasses,
    inactiveTeachers,
  });

  return { alerts, inactiveClasses, inactiveTeachers, pendingInsights };
}
