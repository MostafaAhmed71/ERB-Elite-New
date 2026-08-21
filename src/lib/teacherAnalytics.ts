import { supabase } from './supabase';
import {
  computeStudentWeaknesses,
  computeClassScoreStats,
  type SkillWeakness,
} from './examAnalytics';
import {
  fetchTeacherClassAssignmentsByUserId,
  fetchTeacherProfile,
  filterStudentsByAssignments,
} from './teacherScope';
import type { DbExamResult, DbSkill, DbStudent } from '../types';
import { embedOne } from './supabaseEmbeds';
import { formatGradeLabel } from './academic/constants';
import { academicToOlympiadGrade } from './academic/gradeBridge';
import type { AcademicEducationLevel } from './academic/types';

export type TeacherSubjectAssignment = {
  id: string;
  grade: string;
  subject_name: string;
};

export type TeacherAnalyticsSnapshot = {
  grade: string;
  subjectName: string;
  classLabel: string;
  studentCount: number;
  examsTaken: number;
  avgPct: number | null;
  weaknesses: SkillWeakness[];
  classStats: ReturnType<typeof computeClassScoreStats>;
};

export async function fetchTeacherSubjectAssignments(userId: string): Promise<TeacherSubjectAssignment[]> {
  const teacher = await fetchTeacherProfile(userId);

  // 1) نظام الاختبارات (teacher_subjects) — يربطه المشرف التربوي
  if (teacher) {
    const { data, error } = await supabase
      .from('teacher_subjects')
      .select('id, grade, subject_name')
      .eq('teacher_id', teacher.id)
      .order('grade')
      .order('subject_name');

    if (error && error.code !== '42P01') throw error;
    if (data && data.length) return data as TeacherSubjectAssignment[];
  }

  // 2) الوحدة الأكاديمية — إسناد المدير ثم إعداد المعلم لملفه التعليمي
  return fetchAcademicSubjectAssignments(userId);
}

/**
 * يشتقّ قائمة (الصف × المادة) من الوحدة الأكاديمية عند غياب الربط في نظام الاختبارات.
 * يعتمد أولاً على إسناد المدير (academic_teacher_assignments) ثم على إعداد المعلم
 * لملفه التعليمي (academic_teacher_setups).
 */
async function fetchAcademicSubjectAssignments(userId: string): Promise<TeacherSubjectAssignment[]> {
  const pairs = new Map<string, TeacherSubjectAssignment>();
  const add = (level: AcademicEducationLevel, gradeNum: number, subject: string) => {
    if (!subject || !Number.isFinite(gradeNum)) return;
    const grade = academicToOlympiadGrade(level, gradeNum);
    const key = `${grade}__${subject}`;
    if (!pairs.has(key)) pairs.set(key, { id: key, grade, subject_name: subject });
  };

  // إسناد المدير
  const { data: assigns, error: aErr } = await supabase
    .from('academic_teacher_assignments')
    .select('subjects, education_level, grades_with_sections')
    .eq('teacher_id', userId);
  if (aErr && aErr.code !== '42P01') throw aErr;

  for (const a of (assigns ?? []) as {
    subjects: string[] | null;
    education_level: AcademicEducationLevel;
    grades_with_sections: Record<string, string[]> | null;
  }[]) {
    for (const g of Object.keys(a.grades_with_sections ?? {})) {
      const gradeNum = Number(g);
      for (const subj of a.subjects ?? []) add(a.education_level, gradeNum, subj);
    }
  }

  // إعداد المعلم لملفه التعليمي (احتياطي)
  if (pairs.size === 0) {
    const { data: setup, error: sErr } = await supabase
      .from('academic_teacher_setups')
      .select('education_levels, grades_by_level, subjects, is_setup_complete')
      .eq('teacher_id', userId)
      .maybeSingle();
    if (sErr && sErr.code !== '42P01') throw sErr;

    if (setup?.is_setup_complete) {
      const s = setup as {
        education_levels: AcademicEducationLevel[] | null;
        grades_by_level: Record<string, number[]> | null;
        subjects: string[] | null;
      };
      for (const level of s.education_levels ?? []) {
        for (const gradeNum of s.grades_by_level?.[level] ?? []) {
          for (const subj of s.subjects ?? []) add(level, gradeNum, subj);
        }
      }
    }
  }

  return Array.from(pairs.values()).sort(
    (a, b) => a.grade.localeCompare(b.grade, 'ar') || a.subject_name.localeCompare(b.subject_name, 'ar'),
  );
}

/** S7 — تحليل مادة/صف للمعلم حسب إسناده */
export async function fetchTeacherSubjectAnalytics(
  userId: string,
  grade: string,
  subjectName: string,
): Promise<TeacherAnalyticsSnapshot | null> {
  const [assignments, classAssignments] = await Promise.all([
    fetchTeacherSubjectAssignments(userId),
    fetchTeacherClassAssignmentsByUserId(userId),
  ]);

  const hasSubject = assignments.some((a) => a.grade === grade && a.subject_name === subjectName);
  if (!hasSubject) return null;

  const gradeClasses = classAssignments.filter((a) => a.grade === grade);
  if (gradeClasses.length === 0) return null;

  const { data: allStudents, error: sErr } = await supabase
    .from('students')
    .select('*')
    .eq('is_active', true)
    .eq('grade', grade);
  if (sErr) throw sErr;

  const students = filterStudentsByAssignments(allStudents as DbStudent[], gradeClasses);
  if (students.length === 0) {
    return {
      grade,
      subjectName,
      classLabel: gradeClasses.map((c) => c.class_name).join('، '),
      studentCount: 0,
      examsTaken: 0,
      avgPct: null,
      weaknesses: [],
      classStats: null,
    };
  }

  const studentIds = students.map((s) => s.id);

  const [{ data: results, error: rErr }, { data: skills, error: skErr }] = await Promise.all([
    supabase
      .from('exam_results')
      .select('id, student_id, score, max_score, details, exams(title, subject_name, grade)')
      .in('student_id', studentIds),
    supabase.from('skills').select('*').eq('subject_name', subjectName),
  ]);
  if (rErr) throw rErr;
  if (skErr) throw skErr;

  type ResultRow = Pick<DbExamResult, 'details' | 'score' | 'max_score'> & {
    exams: { title: string; subject_name: string | null; grade: string | null } | null;
  };

  const filtered = (results ?? []).map((row) => {
    const exam = embedOne<{ title: string; subject_name: string | null; grade: string | null }>(row.exams);
    return { ...row, exams: exam };
  }).filter(
    (r) => r.exams?.subject_name === subjectName && r.exams?.grade === grade,
  ) as ResultRow[];

  const pcts = filtered
    .filter((r) => r.max_score > 0)
    .map((r) => Math.round((Number(r.score) / r.max_score) * 100));

  const avgPct =
    pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;

  const gradeSkills = ((skills ?? []) as DbSkill[]).filter(
    (s) => !s.grade || s.grade === grade,
  );

  const weaknesses = computeStudentWeaknesses(filtered, gradeSkills).slice(0, 5);

  return {
    grade,
    subjectName,
    classLabel: gradeClasses.map((c) => c.class_name).join('، '),
    studentCount: students.length,
    examsTaken: filtered.length,
    avgPct,
    weaknesses,
    classStats: computeClassScoreStats(pcts),
  };
}
