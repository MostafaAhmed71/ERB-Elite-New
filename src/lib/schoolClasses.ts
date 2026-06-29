import { supabase } from './supabase';
import { fetchGradeClassCatalog, DEFAULT_GRADE_CLASS_CATALOG } from './schoolConfig';

export const MIDDLE_SCHOOL_GRADES = [
  'الأول المتوسط',
  'الثاني المتوسط',
  'الثالث المتوسط',
] as const;

export const DEFAULT_GRADES = MIDDLE_SCHOOL_GRADES;

export const DEFAULT_CLASSES = ['أ', 'ب', 'ج', 'د'] as const;

export interface GradeClassOption {
  grade: string;
  class_name: string;
}

/** جلب الصفوف والفصول من الطلاب الفعليين + الإعدادات */
export async function fetchGradeClassOptions(): Promise<GradeClassOption[]> {
  try {
    const effective = await fetchEffectiveGradeClassCatalog();
    return effective.grades.flatMap((grade) =>
      (effective.classesByGrade[grade] ?? effective.allClasses).map((class_name) => ({
        grade,
        class_name,
      }))
    );
  } catch {
    return DEFAULT_GRADE_CLASS_CATALOG.grades.flatMap((grade) =>
      DEFAULT_GRADE_CLASS_CATALOG.classes.map((class_name) => ({ grade, class_name }))
    );
  }
}

/** دمج صفوف من مصادر متعددة (كتالوج + بيانات أخرى) */
export function mergeGradeLists(...lists: (string[] | undefined)[]): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    for (const g of list ?? []) {
      if (g) set.add(g);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'ar'));
}

export function getGradesFromOptions(options: GradeClassOption[]): string[] {
  const grades = [...new Set(options.map((o) => o.grade))];
  return grades.length > 0 ? grades : [...MIDDLE_SCHOOL_GRADES];
}

export function getClassesForGrade(options: GradeClassOption[], grade: string): string[] {
  if (!grade) return [];
  const fromOptions = [...new Set(options.filter((o) => o.grade === grade).map((o) => o.class_name))];
  return fromOptions.length > 0 ? fromOptions : [...DEFAULT_CLASSES];
}

export type EffectiveGradeClassCatalog = {
  grades: string[];
  classesByGrade: Record<string, string[]>;
  allClasses: string[];
};

/** دمج الصفوف والفصول من الطلاب الفعليين مع الإعدادات المحفوظة */
export async function fetchEffectiveGradeClassCatalog(): Promise<EffectiveGradeClassCatalog> {
  const [studentsRes, saved] = await Promise.all([
    supabase.from('students').select('grade, class_name').eq('is_active', true),
    fetchGradeClassCatalog(),
  ]);

  if (studentsRes.error) throw studentsRes.error;

  const gradesSet = new Set<string>(saved.grades);
  const classesByGrade = new Map<string, Set<string>>();

  for (const g of saved.grades) {
    classesByGrade.set(g, new Set(saved.classes));
  }

  for (const row of studentsRes.data ?? []) {
    if (!row.grade) continue;
    gradesSet.add(row.grade);
    if (!classesByGrade.has(row.grade)) {
      classesByGrade.set(row.grade, new Set(saved.classes));
    }
    if (row.class_name) {
      classesByGrade.get(row.grade)!.add(row.class_name);
    }
  }

  const grades =
    gradesSet.size > 0
      ? [...gradesSet].sort((a, b) => a.localeCompare(b, 'ar'))
      : [...DEFAULT_GRADE_CLASS_CATALOG.grades];

  const allClassesSet = new Set<string>(saved.classes);
  for (const set of classesByGrade.values()) {
    for (const c of set) allClassesSet.add(c);
  }

  const classesByGradeRecord: Record<string, string[]> = {};
  for (const grade of grades) {
    const list = classesByGrade.get(grade);
    classesByGradeRecord[grade] =
      list && list.size > 0
        ? [...list].sort((a, b) => a.localeCompare(b, 'ar'))
        : [...DEFAULT_GRADE_CLASS_CATALOG.classes];
  }

  return {
    grades,
    classesByGrade: classesByGradeRecord,
    allClasses:
      allClassesSet.size > 0
        ? [...allClassesSet].sort((a, b) => a.localeCompare(b, 'ar'))
        : [...DEFAULT_GRADE_CLASS_CATALOG.classes],
  };
}

/** آخر نشاط لكل مستخدم من سجل الأحداث */
export async function fetchUserLastActivity(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('user_id, timestamp')
    .order('timestamp', { ascending: false })
    .limit(2000);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const row of data) {
    const uid = row.user_id as string | null;
    if (uid && !map[uid]) map[uid] = row.timestamp as string;
  }
  return map;
}
