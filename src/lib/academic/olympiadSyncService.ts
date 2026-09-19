import { supabase } from '../supabase';
import { fetchTeacherProfile } from '../teacherScope';
import type { AcademicEducationLevel, AcademicTeacherAssignment, AcademicTeacherSetup } from './types';
import { academicToOlympiadGrade } from './gradeBridge';
import { gradeSectionKey } from './subjectHelpers';

export type OlympiadClassRow = { grade: string; class_name: string };
export type OlympiadSubjectRow = { grade: string; subject_name: string };

function classKey(row: OlympiadClassRow): string {
  return `${row.grade}__${row.class_name}`;
}

function subjectKey(row: OlympiadSubjectRow): string {
  return `${row.grade}__${row.subject_name}`;
}

/** يبني قائمة الفصول والمواد للمزامنة من الإسناد الأكاديمي + إعداد المعلم */
export async function buildOlympiadSyncPayload(userId: string): Promise<{
  classes: OlympiadClassRow[];
  subjects: OlympiadSubjectRow[];
}> {
  const classMap = new Map<string, OlympiadClassRow>();
  const subjectMap = new Map<string, OlympiadSubjectRow>();

  const addClass = (level: AcademicEducationLevel, gradeNum: number, section: string) => {
    const sec = section?.trim();
    if (!sec) return;
    const grade = academicToOlympiadGrade(level, gradeNum);
    const row = { grade, class_name: sec };
    classMap.set(classKey(row), row);
  };

  const addSubject = (level: AcademicEducationLevel, gradeNum: number, subject: string) => {
    const name = subject?.trim();
    if (!name) return;
    const grade = academicToOlympiadGrade(level, gradeNum);
    const row = { grade, subject_name: name };
    subjectMap.set(subjectKey(row), row);
  };

  const [{ data: assignments, error: aErr }, { data: setup, error: sErr }] = await Promise.all([
    supabase
      .from('academic_teacher_assignments')
      .select('subjects, education_level, grades_with_sections')
      .eq('teacher_id', userId),
    supabase
      .from('academic_teacher_setups')
      .select('education_levels, grades_by_level, sections_by_grade, subjects, subjects_by_grade, is_setup_complete')
      .eq('teacher_id', userId)
      .maybeSingle(),
  ]);

  if (aErr && aErr.code !== '42P01') throw aErr;
  if (sErr && sErr.code !== '42P01') throw sErr;

  const setupRow = setup as AcademicTeacherSetup | null;

  // 1) إسناد المدير (أولوية للمواد حسب الصف)
  for (const row of (assignments ?? []) as Pick<
    AcademicTeacherAssignment,
    'subjects' | 'education_level' | 'grades_with_sections'
  >[]) {
    const level = row.education_level;
    const gradesWithSections = row.grades_with_sections ?? {};
    for (const gradeKey of Object.keys(gradesWithSections)) {
      const gradeNum = Number(gradeKey);
      if (!Number.isFinite(gradeNum)) continue;

      const assignedSections = gradesWithSections[gradeKey] ?? [];
      const fallbackSections = setupRow?.sections_by_grade?.[gradeSectionKey(level, gradeNum)] ?? [];
      const sections = assignedSections.length > 0 ? assignedSections : fallbackSections;

      for (const section of sections) addClass(level, gradeNum, section);
      for (const subject of row.subjects ?? []) addSubject(level, gradeNum, subject);
    }
  }

  // 2) إعداد المعلم (يكمل الفجوات)
  if (setupRow?.is_setup_complete) {
    for (const level of setupRow.education_levels ?? []) {
      for (const gradeNum of setupRow.grades_by_level?.[level] ?? []) {
        const gradeKey = gradeSectionKey(level, gradeNum);
        const sections = setupRow.sections_by_grade?.[gradeKey] ?? [];
        for (const section of sections) addClass(level, gradeNum, section);
        const gradeSubjects =
          setupRow.subjects_by_grade?.[gradeKey]
          ?? setupRow.subjects_by_grade?.[`${level}_${gradeNum}`]
          ?? setupRow.subjects
          ?? [];
        for (const subject of gradeSubjects) addSubject(level, gradeNum, subject);
      }
    }
  }

  return {
    classes: Array.from(classMap.values()),
    subjects: Array.from(subjectMap.values()),
  };
}

/**
 * مزامنة فصول ومواد المعلم في نظام الأولمبياد من الوحدة الأكاديمية.
 * يتطلب migration 065/114 (دالة RPC) — ينشئ ملف teachers إن فُقد.
 */
export async function syncTeacherOlympiadFromAcademic(userId: string): Promise<{
  synced: boolean;
  classes: number;
  subjects: number;
  reason?: string;
}> {
  const payload = await buildOlympiadSyncPayload(userId);
  if (!payload.classes.length && !payload.subjects.length) {
    // ما زال نحاول إنشاء ملف المعلم عبر RPC إن وُجدت فصول فارغة
    const teacher = await fetchTeacherProfile(userId);
    if (!teacher) {
      const { error: ensureErr } = await supabase.rpc('apply_teacher_olympiad_sync', {
        p_user_id: userId,
        p_classes: [],
        p_subjects: [],
      });
      if (ensureErr && ensureErr.code !== '42883') {
        console.warn('ensure teacher profile via sync:', ensureErr.message);
      }
    }
    return { synced: false, classes: 0, subjects: 0, reason: 'empty_payload' };
  }

  const { data, error } = await supabase.rpc('apply_teacher_olympiad_sync', {
    p_user_id: userId,
    p_classes: payload.classes,
    p_subjects: payload.subjects,
  });

  if (error) {
    if (error.code === '42883' || error.message?.includes('apply_teacher_olympiad_sync')) {
      console.warn('Olympiad sync RPC not deployed yet (migration 065/114)');
      return { synced: false, classes: 0, subjects: 0, reason: 'rpc_missing' };
    }
    throw error;
  }

  const result = (data ?? {}) as { synced?: boolean; classes?: number; subjects?: number };
  return {
    synced: result.synced !== false,
    classes: Number(result.classes ?? payload.classes.length),
    subjects: Number(result.subjects ?? payload.subjects.length),
  };
}

/** مزامنة جميع المعلمين النشطين — للمدير بعد تطبيق migration 065 */
export async function syncAllTeachersOlympiadFromAcademic(): Promise<{
  total: number;
  synced: number;
  skipped: number;
}> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'teacher')
    .eq('is_active', true);

  if (error) throw error;

  let synced = 0;
  let skipped = 0;

  for (const row of data ?? []) {
    const result = await syncTeacherOlympiadFromAcademic(row.id);
    if (result.synced) synced += 1;
    else skipped += 1;
  }

  return { total: (data ?? []).length, synced, skipped };
}
