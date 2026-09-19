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
  lessonTopics: Array<Record<string, unknown>>;
  teacherAssignments: Array<Record<string, unknown>>;
  teacherSetups: Array<Record<string, unknown>>;
  academicSubjects: Array<Record<string, unknown>>;
  academicSections: Array<Record<string, unknown>>;
  academicConfig?: Array<Record<string, unknown>>;
  attendanceSessions: Array<Record<string, unknown>>;
  schoolSettings: Array<Record<string, unknown>>;
  competitionQuestions: Array<Record<string, unknown>>;
}

export type BackupProgressCallback = (step: string, percent: number) => void;

export interface BackupTableDefinition {
  key: keyof Omit<SystemBackupPayload, 'metadata'>;
  table: string;
  label: string;
  conflictKey: string;
  order: number;
}

export const BACKUP_TABLES: BackupTableDefinition[] = [
  { key: 'schoolSettings', table: 'school_settings', label: 'إعدادات المنصة والأوزان', conflictKey: 'key', order: 10 },
  { key: 'academicConfig', table: 'academic_config', label: 'إعدادات النظام الأكاديمي', conflictKey: 'key', order: 20 },
  { key: 'users', table: 'users', label: 'المستخدمون والملفات الشخصية', conflictKey: 'id', order: 30 },
  { key: 'students', table: 'students', label: 'بيانات الطلاب والصفوف', conflictKey: 'id', order: 40 },
  { key: 'managedCredentials', table: 'managed_account_credentials', label: 'بيانات الحسابات المولدة', conflictKey: 'id', order: 50 },
  { key: 'academicSubjects', table: 'academic_subjects', label: 'كتالوج المواد الدراسية', conflictKey: 'id', order: 60 },
  { key: 'academicSections', table: 'academic_sections', label: 'الفصول والأقسام الدراسية', conflictKey: 'id', order: 70 },
  { key: 'teacherSetups', table: 'academic_teacher_setups', label: 'إسناد وتهيئة المعلمين للمواد', conflictKey: 'id', order: 80 },
  { key: 'teacherAssignments', table: 'academic_teacher_assignments', label: 'توزيع وإسناد المعلمين', conflictKey: 'id', order: 90 },
  { key: 'teacherSchedules', table: 'academic_teacher_schedules', label: 'الجداول الدراسية الأسبوعية للمعلمين', conflictKey: 'id', order: 100 },
  { key: 'lessonTopics', table: 'academic_lesson_topics', label: 'الموضوعات والملفات التعليمية للمعلمين', conflictKey: 'id', order: 110 },
  { key: 'lessonPlans', table: 'lesson_plans', label: 'الخطط والتحاضير التعليمية للمعلمين', conflictKey: 'id', order: 120 },
  { key: 'weeklyPlans', table: 'academic_weekly_plans', label: 'الخطط الأسبوعية للمعلمين', conflictKey: 'id', order: 130 },
  { key: 'homeworks', table: 'academic_homeworks', label: 'الواجبات والمهام اليومية للمعلمين', conflictKey: 'id', order: 140 },
  { key: 'examReviews', table: 'academic_exam_reviews', label: 'الملفات التعليمية ومراجعات الاختبارات', conflictKey: 'id', order: 150 },
  { key: 'activities', table: 'activities', label: 'الأنشطة المدرسية ومحاورها', conflictKey: 'id', order: 160 },
  { key: 'activitySuggestions', table: 'activity_suggestions', label: 'مقترحات الأنشطة الطلابية', conflictKey: 'id', order: 170 },
  { key: 'pointsLedger', table: 'points_ledger', label: 'سجل حركات ومنح النقاط', conflictKey: 'id', order: 180 },
  { key: 'attendanceSessions', table: 'attendance_class_sessions', label: 'سجلات الحضور والغياب', conflictKey: 'id', order: 190 },
  { key: 'competitionQuestions', table: 'comp_questions', label: 'أسئلة المسابقة اليومية', conflictKey: 'id', order: 200 },
];

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
  const { data: { user } } = await supabase.auth.getUser();
  const rawResults: Record<string, Array<Record<string, unknown>>> = {};

  for (let i = 0; i < BACKUP_TABLES.length; i++) {
    const s = BACKUP_TABLES[i]!;
    onProgress?.(`جاري قراءة ${s.label}...`, Math.round(((i + 1) / (BACKUP_TABLES.length + 1)) * 100));
    rawResults[s.key] = await safeFetchTable(s.table);
  }

  onProgress?.('جاري تجميع وحفظ النسخة الاحتياطية...', 95);

  const summary: Record<string, number> = {};
  for (const s of BACKUP_TABLES) {
    summary[s.label] = rawResults[s.key]?.length ?? 0;
  }

  const metadata: SystemBackupMetadata = {
    platform: PLATFORM_NAME,
    exportedAt: new Date().toISOString(),
    exportedBy: user?.email ?? 'activity_leader',
    version: '1448H-v2.17',
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
    lessonTopics: rawResults.lessonTopics ?? [],
    teacherAssignments: rawResults.teacherAssignments ?? [],
    teacherSetups: rawResults.teacherSetups ?? [],
    academicSubjects: rawResults.academicSubjects ?? [],
    academicSections: rawResults.academicSections ?? [],
    academicConfig: rawResults.academicConfig ?? [],
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

  // 2. الجداول المشمولة
  const sheets: Array<{ name: string; data: Array<Record<string, unknown>> }> = [
    { name: 'الجداول الدراسية للمعلمين', data: backupData.teacherSchedules ?? [] },
    { name: 'الملفات والموضوعات التعليمية', data: backupData.lessonTopics ?? [] },
    { name: 'مراجعات الاختبارات والملفات', data: backupData.examReviews ?? [] },
    { name: 'إسناد المعلمين', data: backupData.teacherAssignments ?? [] },
    { name: 'تهيئة المعلمين', data: backupData.teacherSetups ?? [] },
    { name: 'الخطط الدراسية للمعلمين', data: backupData.lessonPlans ?? [] },
    { name: 'الخطط الأسبوعية', data: backupData.weeklyPlans ?? [] },
    { name: 'الواجبات المدرسية', data: backupData.homeworks ?? [] },
    { name: 'الطلاب', data: backupData.students ?? [] },
    { name: 'سجل النقاط', data: backupData.pointsLedger ?? [] },
    { name: 'المستخدمون', data: backupData.users ?? [] },
    { name: 'الحسابات المولدة', data: backupData.managedCredentials ?? [] },
    { name: 'المواد الدراسية', data: backupData.academicSubjects ?? [] },
    { name: 'الفصول الدراسية', data: backupData.academicSections ?? [] },
    { name: 'الأنشطة المدرسية', data: backupData.activities ?? [] },
    { name: 'الحضور والغياب', data: backupData.attendanceSessions ?? [] },
    { name: 'إعدادات المدرسة', data: backupData.schoolSettings ?? [] },
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

// ============================================================================
// محرك استرداد النسخة الاحتياطية (Backup Restore Engine)
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  payload?: SystemBackupPayload;
  stats: Record<string, { label: string; count: number }>;
  totalRecords: number;
  metadata?: SystemBackupMetadata;
  error?: string;
}

export function validateBackupPayload(jsonContent: string): ValidationResult {
  try {
    const parsed = JSON.parse(jsonContent) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { valid: false, stats: {}, totalRecords: 0, error: 'الملف لا يحتوي على كائن JSON صالح.' };
    }

    const stats: Record<string, { label: string; count: number }> = {};
    let totalRecords = 0;

    for (const def of BACKUP_TABLES) {
      const candidate = parsed[def.key] ?? parsed[def.table];
      const arr = Array.isArray(candidate) ? candidate : [];
      stats[def.key] = { label: def.label, count: arr.length };
      totalRecords += arr.length;
    }

    if (totalRecords === 0) {
      return {
        valid: false,
        stats,
        totalRecords: 0,
        error: 'لم يتم العثور على أي سجلات بيانات صالحة في هذا الملف (تأكد من اختيار ملف نسخة احتياطية صادر من النظام).',
      };
    }

    const metadata = (parsed.metadata as SystemBackupMetadata) ?? {
      platform: 'غير محدد',
      exportedAt: new Date().toISOString(),
      version: 'غير محدد',
      summary: {},
    };

    return {
      valid: true,
      payload: parsed as unknown as SystemBackupPayload,
      stats,
      totalRecords,
      metadata,
    };
  } catch (err) {
    return {
      valid: false,
      stats: {},
      totalRecords: 0,
      error: err instanceof Error ? `تعذر قراءة ملف JSON: ${err.message}` : 'صيغة الملف غير صالحة.',
    };
  }
}

export interface RestoreProgress {
  currentTable: string;
  tableIndex: number;
  totalTables: number;
  percentage: number;
  message: string;
}

export type RestoreProgressCallback = (progress: RestoreProgress) => void;

export interface TableRestoreStatus {
  key: string;
  table: string;
  label: string;
  total: number;
  restored: number;
  skipped: number;
  errors: string[];
}

export interface RestoreResult {
  success: boolean;
  totalRestored: number;
  totalSkipped: number;
  tableStatuses: Record<string, TableRestoreStatus>;
  errors: string[];
}

export interface RestoreOptions {
  selectedTables?: string[]; // array of keys to restore
}

/**
 * استرداد النسخة الاحتياطية وإعادة إدراج وتحديث البيانات في قاعدة بيانات Supabase
 */
export async function restoreSystemBackup(
  payload: SystemBackupPayload,
  options?: RestoreOptions,
  onProgress?: RestoreProgressCallback
): Promise<RestoreResult> {
  const CHUNK_SIZE = 50;
  const selectedKeys = new Set(
    options?.selectedTables && options.selectedTables.length > 0
      ? options.selectedTables
      : BACKUP_TABLES.map((t) => t.key)
  );

  const tablesToRestore = BACKUP_TABLES
    .filter((def) => selectedKeys.has(def.key))
    .sort((a, b) => a.order - b.order);

  const tableStatuses: Record<string, TableRestoreStatus> = {};
  const globalErrors: string[] = [];
  let totalRestored = 0;
  let totalSkipped = 0;

  for (let i = 0; i < tablesToRestore.length; i++) {
    const def = tablesToRestore[i]!;
    const rawData = (payload as unknown as Record<string, unknown>)[def.key] ?? (payload as unknown as Record<string, unknown>)[def.table];
    const rows = Array.isArray(rawData) ? (rawData as Array<Record<string, unknown>>) : [];

    const status: TableRestoreStatus = {
      key: def.key,
      table: def.table,
      label: def.label,
      total: rows.length,
      restored: 0,
      skipped: 0,
      errors: [],
    };
    tableStatuses[def.key] = status;

    if (rows.length === 0) {
      continue;
    }

    const currentPercent = Math.round((i / tablesToRestore.length) * 100);
    onProgress?.({
      currentTable: def.label,
      tableIndex: i + 1,
      totalTables: tablesToRestore.length,
      percentage: currentPercent,
      message: `جاري استرداد ${def.label} (${rows.length} سجل)...`,
    });

    // معالجة بالدفعات (Chunks)
    for (let c = 0; c < rows.length; c += CHUNK_SIZE) {
      const chunk = rows.slice(c, c + CHUNK_SIZE);
      try {
        const { error } = await supabase
          .from(def.table)
          .upsert(chunk, { onConflict: def.conflictKey, ignoreDuplicates: false });

        if (error) {
          // محاولة الإدراج عنصراً بعنصر لإنقاذ ما يمكن إنقاذه
          for (const item of chunk) {
            try {
              const { error: singleError } = await supabase
                .from(def.table)
                .upsert(item, { onConflict: def.conflictKey, ignoreDuplicates: false });

              if (singleError) {
                status.skipped++;
                totalSkipped++;
                if (status.errors.length < 5) {
                  status.errors.push(singleError.message);
                }
              } else {
                status.restored++;
                totalRestored++;
              }
            } catch (singleEx) {
              status.skipped++;
              totalSkipped++;
              if (status.errors.length < 5) {
                status.errors.push(String(singleEx));
              }
            }
          }
        } else {
          status.restored += chunk.length;
          totalRestored += chunk.length;
        }
      } catch (chunkEx) {
        const errMsg = chunkEx instanceof Error ? chunkEx.message : String(chunkEx);
        status.skipped += chunk.length;
        totalSkipped += chunk.length;
        if (status.errors.length < 5) {
          status.errors.push(errMsg);
        }
      }
    }

    if (status.errors.length > 0) {
      globalErrors.push(`${def.label}: تعذر استيراد ${status.skipped} سجل.`);
    }
  }

  onProgress?.({
    currentTable: 'اكتمل',
    tableIndex: tablesToRestore.length,
    totalTables: tablesToRestore.length,
    percentage: 100,
    message: 'تم إكمال استرداد النسخة الاحتياطية بنجاح!',
  });

  return {
    success: totalRestored > 0,
    totalRestored,
    totalSkipped,
    tableStatuses,
    errors: globalErrors,
  };
}
