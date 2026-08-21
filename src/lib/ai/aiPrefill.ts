import { supabase } from '../supabase';
import { academicTeacherService } from '../academic/teacherService';
import { academicWeeklyPlanService } from '../academic/weeklyPlanService';
import {
  mergeTeacherClassRefs,
  type TeacherClassRef,
} from '../academic/teacherSetupHelpers';
import { formatGradeLabel, formatGradeSection, ACADEMIC_LEVEL_LABELS } from '../academic/constants';
import { olympiadGradeToAcademic } from '../academic/gradeBridge';
import type { AcademicEducationLevel, AcademicTeacherAssignment } from '../academic/types';
import { fetchTeacherClassAssignmentsByUserId } from '../teacherScope';
import type { AiGenerateForm } from './types';
import { EMPTY_AI_FORM } from './types';

export type PrefillMeta = {
  autofilled: Partial<Record<keyof AiGenerateForm, boolean>>;
};

export type TeacherAiClassOption = TeacherClassRef & {
  key: string;
  label: string;
  gradeLabel: string;
};

export type TeacherAiContext = {
  subjects: string[];
  classes: TeacherAiClassOption[];
  form: AiGenerateForm;
  meta: PrefillMeta;
};

function classKey(ref: TeacherClassRef): string {
  return `${ref.level}_${ref.grade}_${ref.section}`;
}

export async function countStudentsForClass(
  level: AcademicEducationLevel | string,
  grade: number | string,
  section: string,
): Promise<number | null> {
  const gradeNum = Number(grade);
  const gradeLabel = level
    ? formatGradeLabel(level as AcademicEducationLevel, gradeNum)
    : String(grade);

  let q = supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  if (section) q = q.eq('class_name', section);

  const patterns = [
    String(gradeNum),
    gradeLabel,
    `الصف ${gradeNum}`,
  ].filter(Boolean);

  if (patterns.length) {
    const orExpr = patterns
      .flatMap((p) => [`grade.eq.${p}`, `grade.ilike.%${p}%`])
      .join(',');
    q = q.or(orExpr);
  }

  const { count, error } = await q;
  if (error) return null;
  return count ?? 0;
}

async function listTeacherAssignments(teacherId: string): Promise<AcademicTeacherAssignment[]> {
  const { data, error } = await supabase
    .from('academic_teacher_assignments')
    .select('*')
    .eq('teacher_id', teacherId);
  if (error) {
    if (error.code === '42P01') return [];
    console.warn('ai prefill assignments', error);
    return [];
  }
  return (data ?? []) as AcademicTeacherAssignment[];
}

/** احتياطي من فصول الأولمبياد المرتبطة بحساب المعلم */
async function classRefsFromOlympiad(teacherId: string): Promise<TeacherClassRef[]> {
  try {
    const rows = await fetchTeacherClassAssignmentsByUserId(teacherId);
    const map = new Map<string, TeacherClassRef>();
    for (const row of rows) {
      const parsed = olympiadGradeToAcademic(row.grade);
      const section = String(row.class_name ?? '').trim();
      if (!parsed || !section) continue;
      const ref = { level: parsed.level, grade: parsed.grade, section };
      map.set(classKey(ref), ref);
    }
    return [...map.values()];
  } catch {
    return [];
  }
}

/**
 * يحمّل مواد وفصول المعلم من الإعداد/الإسناد/الجداول ويملأ النموذج.
 */
export async function loadTeacherAiContext(
  teacherId: string,
  teacherName?: string | null,
): Promise<TeacherAiContext> {
  const form: AiGenerateForm = {
    ...EMPTY_AI_FORM,
    teacher_name: teacherName ?? '',
  };
  const autofilled: PrefillMeta['autofilled'] = {};
  if (teacherName) autofilled.teacher_name = true;

  const [setup, schedules, assignments] = await Promise.all([
    academicTeacherService.getSetup(teacherId).catch((err) => {
      console.warn('ai prefill setup', err);
      return null;
    }),
    academicTeacherService.listSchedules(teacherId).catch(() => []),
    listTeacherAssignments(teacherId),
  ]);

  const subjectSet = new Set<string>(setup?.subjects ?? []);
  for (const a of assignments) {
    for (const s of a.subjects ?? []) {
      if (s?.trim()) subjectSet.add(s.trim());
    }
  }
  const subjects = [...subjectSet].sort((a, b) => a.localeCompare(b, 'ar'));

  let classRefs = mergeTeacherClassRefs(setup, schedules, assignments);
  if (!classRefs.length) {
    classRefs = await classRefsFromOlympiad(teacherId);
  }

  const classes: TeacherAiClassOption[] = classRefs.map((ref) => ({
    ...ref,
    key: classKey(ref),
    gradeLabel: formatGradeLabel(ref.level, ref.grade),
    label: formatGradeSection(ref.level, ref.grade, ref.section),
  }));

  if (subjects[0]) {
    form.subject = subjects[0];
    autofilled.subject = true;
  }

  if (classes[0]) {
    const c = classes[0];
    form.education_level = ACADEMIC_LEVEL_LABELS[c.level];
    form.grade = c.gradeLabel;
    form.grade_number = String(c.grade);
    form.section = c.section;
    autofilled.education_level = true;
    autofilled.grade = true;
    autofilled.section = true;

    const count = await countStudentsForClass(c.level, c.grade, c.section);
    if (count != null && count > 0) {
      form.student_count = String(count);
      autofilled.student_count = true;
    }
  }

  try {
    const plans = await academicWeeklyPlanService.listByTeacher(teacherId);
    const preferred =
      plans.find(
        (p) =>
          classes[0]
          && p.education_level === classes[0].level
          && String(p.grade) === form.grade_number
          && p.section === form.section,
      ) ?? plans[0];

    if (preferred) {
      const entry =
        (preferred.entries ?? []).find((e) => {
          const topic = e.lesson_topic?.trim();
          const subjectOk = !form.subject || !e.subject || e.subject === form.subject;
          const ownerOk = !e.teacher_id || e.teacher_id === teacherId;
          return !!topic && ownerOk && subjectOk;
        })
        ?? (preferred.entries ?? []).find((e) => e.lesson_topic?.trim());

      if (entry?.lesson_topic?.trim()) {
        form.lesson = entry.lesson_topic.trim();
        autofilled.lesson = true;
        const parts = entry.lesson_topic.split(/\s*[-–—]\s*/);
        if (parts.length > 1 && parts[0].trim()) {
          form.unit = parts[0].trim();
          autofilled.unit = true;
        }
        if (entry.subject && subjects.includes(entry.subject)) {
          form.subject = entry.subject;
          autofilled.subject = true;
        }
      }
    }
  } catch {
    /* اختياري */
  }

  return { subjects, classes, form, meta: { autofilled } };
}

/** @deprecated استخدم loadTeacherAiContext */
export async function buildAiFormFromPlatform(
  teacherId: string,
  teacherName?: string | null,
): Promise<{ form: AiGenerateForm; meta: PrefillMeta }> {
  const ctx = await loadTeacherAiContext(teacherId, teacherName);
  return { form: ctx.form, meta: ctx.meta };
}
