import { computeGrowthReport, computeItemAnalysis, inferExamType, pct, type GrowthRow } from './examAnalytics';
import type { DbExam, DbExamResult, DbStudent, ExamResultDetail } from '../types';

export type ClassAlert = {
  grade: string;
  class_name: string;
  avgPct: number;
  studentCount: number;
};

export type WeeklyExamRow = {
  id: string;
  title: string;
  grade: string | null;
  subject_name: string | null;
  is_active: boolean;
  status: 'active' | 'ended' | 'scheduled';
  starts_at: string | null;
  ends_at: string | null;
};

export type WeakQuestionAlert = {
  question_id: string;
  question_text: string;
  p_value: number;
  skill_name: string;
  subject_name: string;
};

export type MissingDiagnostic = {
  grade: string;
  subject_name: string;
};

export type ClassSubjectCompare = {
  class_name: string;
  avgPct: number | null;
  studentsTested: number;
  examCount: number;
};

export type AtRiskStudent = {
  student: DbStudent;
  avgPct: number | null;
  reason: string;
  growthDecline: number | null;
};

type ResultRow = Pick<DbExamResult, 'student_id' | 'score' | 'max_score' | 'details' | 'exam_id'> & {
  exams: { title: string; subject_name: string | null; grade: string | null; exam_type?: string | null } | null;
};

export function computeClassAlerts(students: DbStudent[], results: ResultRow[], threshold = 60): ClassAlert[] {
  const byClass = new Map<string, { grade: string; class_name: string; pcts: number[] }>();

  for (const s of students) {
    const key = `${s.grade}__${s.class_name}`;
    if (!byClass.has(key)) byClass.set(key, { grade: s.grade, class_name: s.class_name, pcts: [] });
  }

  for (const r of results) {
    if (r.max_score <= 0) continue;
    const student = students.find((s) => s.id === r.student_id);
    if (!student) continue;
    const key = `${student.grade}__${student.class_name}`;
    const entry = byClass.get(key);
    if (entry) entry.pcts.push(pct(Number(r.score), r.max_score));
  }

  const alerts: ClassAlert[] = [];
  for (const entry of byClass.values()) {
    if (entry.pcts.length === 0) continue;
    const avg = Math.round(entry.pcts.reduce((a, b) => a + b, 0) / entry.pcts.length);
    if (avg < threshold) {
      alerts.push({
        grade: entry.grade,
        class_name: entry.class_name,
        avgPct: avg,
        studentCount: students.filter((s) => s.grade === entry.grade && s.class_name === entry.class_name).length,
      });
    }
  }
  return alerts.sort((a, b) => a.avgPct - b.avgPct);
}

export function classifyWeeklyExams(exams: DbExam[], now = new Date()): WeeklyExamRow[] {
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  return exams
    .filter((e) => {
      const ref = e.ends_at ?? e.starts_at ?? e.created_at;
      return new Date(ref) >= weekStart;
    })
    .map((e) => {
      let status: WeeklyExamRow['status'] = 'scheduled';
      const start = e.starts_at ? new Date(e.starts_at) : null;
      const end = e.ends_at ? new Date(e.ends_at) : null;
      if (e.is_active && (!start || start <= now) && (!end || end >= now)) status = 'active';
      else if (end && end < now) status = 'ended';
      else if (start && start > now) status = 'scheduled';
      else if (e.is_active) status = 'active';
      else status = 'ended';

      return {
        id: e.id,
        title: e.title,
        grade: e.grade,
        subject_name: e.subject_name,
        is_active: e.is_active,
        status,
        starts_at: e.starts_at,
        ends_at: e.ends_at,
      };
    })
    .sort((a, b) => (b.starts_at ?? b.ends_at ?? '').localeCompare(a.starts_at ?? a.ends_at ?? ''));
}

export function findSubjectsWithoutDiagnostic(
  gradeSubjects: { grade: string; subject_name: string }[],
  exams: DbExam[],
): MissingDiagnostic[] {
  const missing: MissingDiagnostic[] = [];
  for (const gs of gradeSubjects) {
    const has = exams.some(
      (e) =>
        e.grade === gs.grade &&
        e.subject_name === gs.subject_name &&
        inferExamType(e.title, e.exam_type) === 'diagnostic',
    );
    if (!has) missing.push({ grade: gs.grade, subject_name: gs.subject_name });
  }
  return missing;
}

export function findWeakQuestions(
  results: ResultRow[],
  questionMeta: Map<string, { text: string; skill_name: string; subject_name: string }>,
  pThreshold = 25,
): WeakQuestionAlert[] {
  return computeItemAnalysis(results, questionMeta)
    .filter((r) => r.total_attempts >= 5 && r.p_value < pThreshold)
    .map((r) => ({
      question_id: r.question_id,
      question_text: r.question_text,
      p_value: r.p_value,
      skill_name: r.skill_name,
      subject_name: questionMeta.get(r.question_id)?.subject_name ?? '—',
    }));
}

export function compareClassesBySubject(
  students: DbStudent[],
  results: ResultRow[],
  grade: string,
  subjectName: string,
): ClassSubjectCompare[] {
  const classNames = [...new Set(students.filter((s) => s.grade === grade).map((s) => s.class_name))].sort();

  return classNames.map((class_name) => {
    const classStudentIds = new Set(
      students.filter((s) => s.grade === grade && s.class_name === class_name).map((s) => s.id),
    );
    const subjectResults = results.filter(
      (r) =>
        classStudentIds.has(r.student_id) &&
        r.exams?.subject_name === subjectName &&
        r.exams?.grade === grade,
    );
    const pcts = subjectResults.filter((r) => r.max_score > 0).map((r) => pct(Number(r.score), r.max_score));
    const testedStudents = new Set(subjectResults.map((r) => r.student_id)).size;
    const examIds = new Set(subjectResults.map((r) => r.exam_id));

    return {
      class_name,
      avgPct: pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
      studentsTested: testedStudents,
      examCount: examIds.size,
    };
  });
}

export function computeAtRiskStudents(
  students: DbStudent[],
  results: ResultRow[],
  growthRows: GrowthRow[],
): AtRiskStudent[] {
  const growthByStudent = new Map<string, GrowthRow[]>();
  for (const g of growthRows) {
    if (!growthByStudent.has(g.student_id)) growthByStudent.set(g.student_id, []);
    growthByStudent.get(g.student_id)!.push(g);
  }

  const out: AtRiskStudent[] = [];

  for (const student of students) {
    const studentResults = results.filter((r) => r.student_id === student.id);
    const pcts = studentResults.filter((r) => r.max_score > 0).map((r) => pct(Number(r.score), r.max_score));
    const avgPct = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;

    const declines = (growthByStudent.get(student.id) ?? []).filter(
      (g) => g.growth_pts !== null && g.growth_pts < -5,
    );
    const worstDecline = declines.length > 0 ? Math.min(...declines.map((g) => g.growth_pts!)) : null;

    const reasons: string[] = [];
    if (avgPct !== null && avgPct < 50) reasons.push(`متوسط ${avgPct}%`);
    if (worstDecline !== null) reasons.push(`تراجع ${worstDecline}% في مادة`);

    if (reasons.length > 0) {
      out.push({
        student,
        avgPct,
        reason: reasons.join(' — '),
        growthDecline: worstDecline,
      });
    }
  }

  return out.sort((a, b) => (a.avgPct ?? 0) - (b.avgPct ?? 0));
}

export type ClassExamRow = {
  key: string;
  grade: string;
  class_name: string;
  label: string;
  studentCount: number;
  studentsTested: number;
  avgPct: number;
  resultCount: number;
  passRate: number;
};

export function buildClassExamReport(
  students: Pick<DbStudent, 'id' | 'grade' | 'class_name'>[],
  results: Pick<DbExamResult, 'student_id' | 'score' | 'max_score'>[],
): ClassExamRow[] {
  const byClass = new Map<string, { grade: string; class_name: string; studentIds: Set<string> }>();

  for (const s of students) {
    const key = `${s.grade}__${s.class_name}`;
    if (!byClass.has(key)) {
      byClass.set(key, { grade: s.grade, class_name: s.class_name, studentIds: new Set() });
    }
    byClass.get(key)!.studentIds.add(s.id);
  }

  const stats = new Map<string, { pcts: number[]; tested: Set<string> }>();
  for (const r of results) {
    if (r.max_score <= 0) continue;
    const student = students.find((s) => s.id === r.student_id);
    if (!student) continue;
    const key = `${student.grade}__${student.class_name}`;
    if (!stats.has(key)) stats.set(key, { pcts: [], tested: new Set() });
    const entry = stats.get(key)!;
    entry.pcts.push(pct(Number(r.score), r.max_score));
    entry.tested.add(r.student_id);
  }

  return Array.from(byClass.entries())
    .map(([key, cls]) => {
      const st = stats.get(key);
      const pcts = st?.pcts ?? [];
      return {
        key,
        grade: cls.grade,
        class_name: cls.class_name,
        label: `${cls.grade} — ${cls.class_name}`,
        studentCount: cls.studentIds.size,
        studentsTested: st?.tested.size ?? 0,
        avgPct: pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
        resultCount: pcts.length,
        passRate: pcts.length > 0 ? Math.round((pcts.filter((p) => p >= 60).length / pcts.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.avgPct - a.avgPct);
}

export type ClassExamSubjectRow = {
  subject_name: string;
  avgPct: number;
  resultCount: number;
};

export type ClassExamStudentRow = {
  student_id: string;
  full_name: string;
  avgPct: number;
  examsTaken: number;
};

export function buildClassExamDetail(
  students: Pick<DbStudent, 'id' | 'full_name' | 'grade' | 'class_name'>[],
  results: Array<
    Pick<DbExamResult, 'student_id' | 'score' | 'max_score'> & {
      exams: { subject_name: string | null } | null;
    }
  >,
  grade: string,
  className: string,
): {
  summary: ClassExamRow | null;
  subjects: ClassExamSubjectRow[];
  studentRows: ClassExamStudentRow[];
} {
  const classStudents = students.filter((s) => s.grade === grade && s.class_name === className);
  const classStudentIds = new Set(classStudents.map((s) => s.id));
  const classResults = results.filter((r) => classStudentIds.has(r.student_id) && r.max_score > 0);

  const summaryList = buildClassExamReport(classStudents, classResults);
  const summary = summaryList.find((r) => r.grade === grade && r.class_name === className) ?? null;

  const bySubject = new Map<string, number[]>();
  for (const r of classResults) {
    const subject = r.exams?.subject_name ?? '—';
    if (!bySubject.has(subject)) bySubject.set(subject, []);
    bySubject.get(subject)!.push(pct(Number(r.score), r.max_score));
  }

  const subjects: ClassExamSubjectRow[] = Array.from(bySubject.entries())
    .map(([subject_name, pcts]) => ({
      subject_name,
      avgPct: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      resultCount: pcts.length,
    }))
    .sort((a, b) => b.avgPct - a.avgPct);

  const byStudent = new Map<string, number[]>();
  for (const r of classResults) {
    if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, []);
    byStudent.get(r.student_id)!.push(pct(Number(r.score), r.max_score));
  }

  const studentRows: ClassExamStudentRow[] = classStudents
    .map((s) => {
      const pcts = byStudent.get(s.id) ?? [];
      return {
        student_id: s.id,
        full_name: s.full_name,
        avgPct: pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
        examsTaken: pcts.length,
      };
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));

  return { summary, subjects, studentRows };
}

/** بناء خريطة بيانات الأسئلة من النتائج */
export function buildQuestionMetaFromDetails(
  results: Pick<DbExamResult, 'details'>[],
  skillMap: Map<string, { skill_name: string; subject_name: string }>,
  questionTexts: Map<string, string>,
): Map<string, { text: string; skill_name: string; subject_name: string }> {
  const meta = new Map<string, { text: string; skill_name: string; subject_name: string }>();
  for (const r of results) {
    for (const d of (r.details ?? []) as ExamResultDetail[]) {
      if (meta.has(d.question_id)) continue;
      const skill = skillMap.get(d.skill_id);
      meta.set(d.question_id, {
        text: questionTexts.get(d.question_id) ?? 'سؤال',
        skill_name: skill?.skill_name ?? '—',
        subject_name: skill?.subject_name ?? '—',
      });
    }
  }
  return meta;
}
