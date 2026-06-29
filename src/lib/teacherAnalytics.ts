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
  if (!teacher) return [];

  const { data, error } = await supabase
    .from('teacher_subjects')
    .select('id, grade, subject_name')
    .eq('teacher_id', teacher.id)
    .order('grade')
    .order('subject_name');

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return (data ?? []) as TeacherSubjectAssignment[];
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
