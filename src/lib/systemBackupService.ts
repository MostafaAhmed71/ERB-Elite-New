import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { PLATFORM_NAME } from './branding';

export interface SystemBackupMetadata {
  platform: string;
  exportedAt: string;
  exportedBy?: string;
  version: string;
  summary: Record<string, number>;
}

export interface SystemBackupPayload {
  metadata: SystemBackupMetadata;
  students: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
  managedCredentials: Array<Record<string, unknown>>;
  pointsLedger: Array<Record<string, unknown>>;
  activities: Array<Record<string, unknown>>;
  activitySuggestions: Array<Record<string, unknown>>;
  lessonPlans: Array<Record<string, unknown>>;
  weeklyPlans: Array<Record<string, unknown>>;
  homeworks: Array<Record<string, unknown>>;
  examReviews: Array<Record<string, unknown>>;
  teacherSchedules: Array<Record<string, unknown>>;
  teacherSetups: Array<Record<string, unknown>>;
  academicSubjects: Array<Record<string, unknown>>;
  attendanceSessions: Array<Record<string, unknown>>;
  schoolSettings: Array<Record<string, unknown>>;
  competitionQuestions: Array<Record<string, unknown>>;
}

export type BackupProgressCallback = (step: string, percent: number) => void;

async function safeFetchTable(table: string, columns = '*', limit = 10000): Promise<Array<Record<string, unknown>>> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .limit(limit);

    if (error) {
      console.warn(`safeFetchTable(${table}) skipped:`, error.message);
      return [];
    }
    return (data ?? []) as unknown as Array<Record<string, unknown>>;
  } catch (err) {
    console.warn(`safeFetchTable(${table}) exception:`, err);
    return [];
  }
}

/**
 * جلب كافة بيانات النظام بأمان من قاعدة البيانات
 */
export async function fetchCompleteSystemBackup(
  onProgress?: BackupProgressCallback
): Promise<SystemBackupPayload> {
  const steps = [
    { key: 'students', label: 'بيانات الطلاب والصفوف', table: 'students' },
    { key: 'users', label: 'المستخدمون والملفات الشخصية', table: 'users' },
    { key: 'managedCredentials', label: 'بيانات الحسابات المولدة', table: 'managed_account_credentials' },
    { key: 'pointsLedger', label: 'سجل حركات النقاط', table: 'points_ledger' },
    { key: 'activities', label: 'الأنشطة المدرسية', table: 'activities' },
    { key: 'activitySuggestions', label: 'مقترحات الأنشطة', table: 'activity_suggestions' },
    { key: 'lessonPlans', label: 'الخطط الدراسية للمعلمين', table: 'lesson_plans' },
    { key: 'weeklyPlans', label: 'الخطط الأسبوعية', table: 'academic_weekly_plans' },
    { key: 'homeworks', label: 'الواجبات اليومية', table: 'academic_homeworks' },
    { key: 'examReviews', label: 'مراجعات الاختبارات', table: 'academic_exam_reviews' },
    { key: 'teacherSchedules', label: 'الجداول الدراسية الأسبوعية', table: 'academic_teacher_schedules' },
    { key: 'teacherSetups', label: 'إسناد المعلمين للمواد', table: 'academic_teacher_setups' },
    { key: 'academicSubjects', label: 'كتالوج المواد الدراسية', table: 'academic_subjects' },
    { key: 'attendanceSessions', label: 'سجلات الحضور والغياب', table: 'attendance_class_sessions' },
    { key: 'schoolSettings', label: 'إعدادات المنصة والأوزان', table: 'school_settings' },
    { key: 'competitionQuestions', label: 'أسئلة المسابقة اليومية', table: 'comp_questions' },
  ];

  const { data: { user } } = await supabase.auth.getUser();
  const rawResults: Record<string, Array<Record<string, unknown>>> = {};

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]!;
    onProgress?.(`جاري قراءة ${s.label}...`, Math.round(((i + 1) / (steps.length + 1)) * 100));
    rawResults[s.key] = await safeFetchTable(s.table);
  }

  onProgress?.('جاري تجميع النسخة الاحتياطية...', 95);

  const summary: Record<string, number> = {};
  for (const s of steps) {
    summary[s.label] = rawResults[s.key]?.length ?? 0;
  }

  const metadata: SystemBackupMetadata = {
    platform: PLATFORM_NAME,
    exportedAt: new Date().toISOString(),
    exportedBy: user?.email ?? 'activity_leader',
    version: '1448H',
    summary,
  };

  const payload: SystemBackupPayload = {
    metadata,
    students: rawResults.students ?? [],
    users: rawResults.users ?? [],
    managedCredentials: rawResults.managedCredentials ?? [],
    pointsLedger: rawResults.pointsLedger ?? [],
    activities: rawResults.activities ?? [],
    activitySuggestions: rawResults.activitySuggestions ?? [],
    lessonPlans: rawResults.lessonPlans ?? [],
    weeklyPlans: rawResults.weeklyPlans ?? [],
    homeworks: rawResults.homeworks ?? [],
    examReviews: rawResults.examReviews ?? [],
    teacherSchedules: rawResults.teacherSchedules ?? [],
    teacherSetups: rawResults.teacherSetups ?? [],
    academicSubjects: rawResults.academicSubjects ?? [],
    attendanceSessions: rawResults.attendanceSessions ?? [],
    schoolSettings: rawResults.schoolSettings ?? [],
    competitionQuestions: rawResults.competitionQuestions ?? [],
  };

  onProgress?.('اكتمل تجهيز النسخة الاحتياطية بنجاح!', 100);
  return payload;
}

/**
 * تنزيل النسخة الاحتياطية كملف JSON مهيكل
 */
export function downloadBackupAsJson(backupData: SystemBackupPayload, fileName?: string): void {
  const stamp = new Date().toISOString().slice(0, 10);
  const name = fileName || `نسخة_احتياطية_شاملة_النخبة_${stamp}.json`;

  const blob = new Blob([JSON.stringify(backupData, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * تحويل مصفوفة كائنات إلى صفوف بسيطة مناسبة للإكسل مع تجنب [object Object]
 */
function sanitizeForSheet(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v === null || v === undefined) {
        clean[k] = '';
      } else if (typeof v === 'object') {
        clean[k] = JSON.stringify(v);
      } else {
        clean[k] = v;
      }
    }
    return clean;
  });
}

/**
 * تنزيل النسخة كملف إكسل متعدد الصفحات (Multi-Sheet Workbook)
 */
export function downloadBackupAsExcel(backupData: SystemBackupPayload, fileName?: string): void {
  const wb = XLSX.utils.book_new();

  // 1. ورقة الملخص
  const summaryRows = [
    { 'البيان': 'اسم المنصة', 'القيمة': backupData.metadata.platform },
    { 'البيان': 'تاريخ النسخ الاحتياطي', 'القيمة': new Date(backupData.metadata.exportedAt).toLocaleString('ar-SA') },
    { 'البيان': 'المستخدم المنفذ', 'القيمة': backupData.metadata.exportedBy || '' },
    { 'البيان': 'إصدار المنصة', 'القيمة': backupData.metadata.version },
    ...Object.entries(backupData.metadata.summary).map(([k, count]) => ({
      'البيان': `إجمالي ${k}`,
      'القيمة': count,
    })),
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'ملخص النسخة');

  // 2. الجداول الأساسية
  const sheets: Array<{ name: string; data: Array<Record<string, unknown>> }> = [
    { name: 'الطلاب', data: backupData.students },
    { name: 'سجل النقاط', data: backupData.pointsLedger },
    { name: 'الحسابات المولدة', data: backupData.managedCredentials },
    { name: 'الخطط الدراسية', data: backupData.lessonPlans },
    { name: 'الواجبات', data: backupData.homeworks },
    { name: 'الجداول الدراسية', data: backupData.teacherSchedules },
    { name: 'إسناد المعلمين', data: backupData.teacherSetups },
    { name: 'الأنشطة المدرسية', data: backupData.activities },
    { name: 'المستخدمون', data: backupData.users },
    { name: 'الخطط الأسبوعية', data: backupData.weeklyPlans },
    { name: 'المواد الدراسية', data: backupData.academicSubjects },
    { name: 'الحضور والغياب', data: backupData.attendanceSessions },
    { name: 'إعدادات المدرسة', data: backupData.schoolSettings },
  ];

  for (const s of sheets) {
    if (s.data.length > 0) {
      const sanitized = sanitizeForSheet(s.data);
      const sheet = XLSX.utils.json_to_sheet(sanitized);
      XLSX.utils.book_append_sheet(wb, sheet, s.name);
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const name = fileName || `نسخة_احتياطية_شاملة_النخبة_${stamp}.xlsx`;
  XLSX.writeFile(wb, name);
}
