import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { School, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { exportRowsToExcel } from '../../lib/exportExcel';
import {
  averagePerStudent,
  buildClassAxisReport,
  buildClassStudentPointsRows,
  type ClassStudentPointsRow,
} from '../../lib/classReport';
import { buildClassExamDetail } from '../../lib/supervisorInsights';
import { computeStudentWeaknesses } from '../../lib/examAnalytics';
import { simpleAttendanceCounts } from '../../lib/attendanceScore';
import { fetchAttendanceForStudents } from '../../lib/attendanceQueries';
import { fetchClassGrantsForClass } from '../../lib/classPoints';
import { embedOne } from '../../lib/supabaseEmbeds';
import { useGradeClassCatalog, useSyncedGrade } from '../../hooks/useGradeClassCatalog';
import { useAuthStore } from '../../stores/authStore';
import { StudentDetailModal } from '../../components/supervisor/StudentDetailModal';
import { ClassStudentPointsModal } from '../../components/admin/ClassStudentPointsModal';
import type { DbExamResult, DbSkill, DbStudent } from '../../types';
import clsx from 'clsx';

type ExamResultRow = DbExamResult & {
  exams: {
    title: string;
    subject_name: string | null;
    grade: string | null;
    exam_type?: string | null;
  } | null;
};

type ExamStudentDetail = DbStudent & {
  avgPct: number | null;
  examsTaken: number;
  results: ExamResultRow[];
  weaknesses: ReturnType<typeof computeStudentWeaknesses>;
  attendancePresent: number;
  attendanceAbsent: number;
};

function examScoreColor(pct: number | null) {
  if (pct === null) return 'bg-white/5 text-white/35 border-white/10';
  if (pct >= 80) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (pct >= 60) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-red-500/15 text-red-300 border-red-500/30';
}

export function ClassDetailReportPage() {
  const { role } = useAuthStore();
  const useExamReport = role === 'supervisor' || role === 'principal';
  const { data: catalog } = useGradeClassCatalog();
  const [grade, setGrade] = useSyncedGrade(catalog?.grades ?? []);
  const classOptions = useMemo(
    () => (grade ? catalog?.classesByGrade[grade] ?? catalog?.allClasses ?? [] : []),
    [catalog, grade],
  );
  const [className, setClassName] = useSyncedGrade(classOptions);
  const [selectedExamStudent, setSelectedExamStudent] = useState<ExamStudentDetail | null>(null);
  const [selectedPointsStudent, setSelectedPointsStudent] = useState<ClassStudentPointsRow | null>(null);

  const { data: classStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['admin', 'class-detail', 'students', grade, className],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('grade', grade)
        .eq('class_name', className)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data as DbStudent[];
    },
    enabled: !!grade && !!className,
  });

  const { data: pointsReport, isLoading: pointsLoading } = useQuery({
    queryKey: ['admin', 'class-detail', 'points', 'v2', grade, className, classStudents.map((s) => s.id).join(',')],
    queryFn: async () => {
      const studentIds = classStudents.map((s) => s.id);
      const [ledgerRes, classGrants, attendanceByStudent] = await Promise.all([
        supabase
          .from('points_ledger')
          .select(`
            student_id, points, status, activity_id, created_at,
            activities (name, category),
            students:student_id (grade, class_name, full_name)
          `)
          .eq('status', 'approved'),
        fetchClassGrantsForClass(grade, className),
        fetchAttendanceForStudents(studentIds),
      ]);
      const { data, error } = ledgerRes;
      if (error) throw error;

      const classLedger = (data ?? []).filter((row) => {
        const s = embedOne<{ grade: string; class_name: string }>(row.students);
        return s?.grade === grade && s?.class_name === className;
      });

      const rows = buildClassAxisReport(
        (data ?? []) as unknown as Parameters<typeof buildClassAxisReport>[0],
        classGrants
      );
      const summary =
        rows.find((r) => r.grade === grade && r.class_name === className) ?? {
          key: `${grade}__${className}`,
          grade,
          class_name: className,
          label: `${grade} — ${className}`,
          studentCount: classStudents.length,
          activity: 0,
          behavior: 0,
          achievement: 0,
          initiative: 0,
          weighted: 0,
          grantCount: 0,
        };

      if (summary.studentCount === 0) {
        summary.studentCount = classStudents.length;
      }

      const activityBreakdown: Record<string, number> = {};
      for (const row of classLedger) {
        const act = embedOne<{ name: string }>(row.activities)?.name ?? 'عام';
        activityBreakdown[act] = (activityBreakdown[act] ?? 0) + row.points;
      }
      if (classGrants.length > 0) {
        const classGrantTotal = classGrants.reduce((sum, g) => sum + g.points, 0);
        activityBreakdown['منح جماعي للفصل'] =
          (activityBreakdown['منح جماعي للفصل'] ?? 0) + classGrantTotal;
      }

      const studentRows = buildClassStudentPointsRows(classStudents, classLedger as unknown as Parameters<typeof buildClassStudentPointsRows>[1], attendanceByStudent);

      return { summary, activityBreakdown, studentRows };
    },
    enabled: !useExamReport && !!grade && !!className && !studentsLoading,
  });

  const { data: examReport, isLoading: examLoading } = useQuery({
    queryKey: ['admin', 'class-detail', 'exams', 'v2', grade, className, classStudents.map((s) => s.id).join(',')],
    queryFn: async () => {
      const studentIds = classStudents.map((s) => s.id);
      const [resultsRes, skillsRes, attendanceByStudent] = await Promise.all([
        studentIds.length > 0
          ? supabase
              .from('exam_results')
              .select('*, exams(title, subject_name, grade, exam_type)')
              .in('student_id', studentIds)
              .order('submitted_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        supabase.from('skills').select('*').eq('grade', grade),
        fetchAttendanceForStudents(studentIds),
      ]);
      if (resultsRes.error) throw resultsRes.error;
      if (skillsRes.error) throw skillsRes.error;

      const base = buildClassExamDetail(
        classStudents,
        resultsRes.data ?? [],
        grade,
        className,
      );
      const skills = (skillsRes.data ?? []) as DbSkill[];
      const results = (resultsRes.data ?? []) as ExamResultRow[];

      const studentDetails: ExamStudentDetail[] = classStudents.map((student) => {
        const studentResults = results.filter((r) => r.student_id === student.id);
        const pcts = studentResults
          .filter((r) => r.max_score > 0)
          .map((r) => (Number(r.score) / r.max_score) * 100);
        const avgPct =
          pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
        const attendance = simpleAttendanceCounts(attendanceByStudent.get(student.id) ?? []);

        return {
          ...student,
          avgPct,
          examsTaken: studentResults.length,
          results: studentResults,
          weaknesses: computeStudentWeaknesses(studentResults, skills),
          attendancePresent: attendance.present,
          attendanceAbsent: attendance.absent,
        };
      });

      return { ...base, studentDetails };
    },
    enabled: useExamReport && !!grade && !!className && !studentsLoading,
  });

  const isLoading = studentsLoading || (useExamReport ? examLoading : pointsLoading);

  const activityRows = useMemo(
    () =>
      Object.entries(pointsReport?.activityBreakdown ?? {})
        .map(([name, points]) => ({ name, points }))
        .sort((a, b) => b.points - a.points),
    [pointsReport],
  );

  const pointsStudentRows = pointsReport?.studentRows ?? [];
  const examStudentRows = examReport?.studentDetails ?? [];

  const handleExport = () => {
    if (useExamReport && examReport) {
      exportRowsToExcel(
        examStudentRows.map((r) => ({
          الطالب: r.full_name,
          'متوسط %': r.avgPct ?? '—',
          اختبارات: r.examsTaken,
        })),
        'الطلاب',
        `فصل-اختبارات-${grade}-${className}.xlsx`,
      );
      return;
    }
    if (pointsReport) {
      exportRowsToExcel(
        pointsStudentRows.map((r) => ({
          الطالب: r.full_name,
          نشاط: r.activity,
          سلوك: r.behavior,
          إنجاز: r.achievement,
          مبادرة: r.initiative,
          موزون: r.weighted,
        })),
        'الطلاب',
        `فصل-${grade}-${className}.xlsx`,
      );
    }
  };

  const renderStudentList = () => {
    if (useExamReport) {
      return (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">طلاب الفصل</h3>
            <span className="text-white/35 text-xs">{examStudentRows.length} طالب</span>
          </div>
          <div className="divide-y divide-white/5 max-h-[28rem] overflow-y-auto">
            {examStudentRows.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">لا يوجد طلاب في هذا الفصل</p>
            ) : (
              examStudentRows.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedExamStudent(student)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 text-right transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 text-sm font-bold flex-shrink-0">
                    {student.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{student.full_name}</p>
                    <p className="text-white/35 text-xs mt-0.5">
                      {student.examsTaken > 0
                        ? `${student.examsTaken} اختبار`
                        : 'لم يُجرِ اختبارات بعد'}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      'text-sm font-bold px-3 py-1 rounded-full border flex-shrink-0 tabular-nums',
                      examScoreColor(student.avgPct),
                    )}
                  >
                    {student.avgPct !== null ? `${student.avgPct}%` : '—'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">طلاب الفصل</h3>
          <span className="text-white/35 text-xs">{pointsStudentRows.length} طالب</span>
        </div>
        <div className="divide-y divide-white/5 max-h-[28rem] overflow-y-auto">
          {pointsStudentRows.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">لا يوجد طلاب في هذا الفصل</p>
          ) : (
            pointsStudentRows.map((student) => (
              <button
                key={student.student_id}
                type="button"
                onClick={() => setSelectedPointsStudent(student)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 text-right transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 text-sm font-bold flex-shrink-0">
                  {student.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{student.full_name}</p>
                  <p className="text-white/35 text-xs mt-0.5">
                    {student.grantCount > 0
                      ? `${student.grantCount} عملية منح`
                      : 'لا توجد نقاط معتمدة'}
                  </p>
                </div>
                <span className="text-gold-400 font-bold tabular-nums flex-shrink-0">
                  {student.weighted}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="تقرير أداء الفصل"
        subtitle={useExamReport ? 'نتائج الاختبارات حسب المادة والطالب' : 'نقاط وأنشطة فقط — الحضور مؤجّل'}
        icon={School}
        guidePath="/admin/class-report"
        actions={
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={classStudents.length === 0}>
            <Download className="w-4 h-4" /> Excel
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <select
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value);
            setClassName('');
          }}
          className="bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        >
          <option value="">اختر الصف</option>
          {(catalog?.grades ?? []).map((g) => (
            <option key={g} value={g} className="bg-navy-950">
              {g}
            </option>
          ))}
        </select>
        <select
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          disabled={!grade}
          className="bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm disabled:opacity-40"
        >
          <option value="">اختر الفصل</option>
          {classOptions.map((c) => (
            <option key={c} value={c} className="bg-navy-950">
              {c}
            </option>
          ))}
        </select>
      </div>

      {!grade || !className ? (
        <div className="glass-card p-12 text-center text-white/30 text-sm">اختر الصف والفصل لعرض التقرير</div>
      ) : isLoading ? (
        <TapHandLoader label="جاري تحميل التقرير..." fullScreen />
      ) : classStudents.length === 0 ? (
        <div className="glass-card p-12 text-center text-white/30 text-sm">لا يوجد طلاب في هذا الفصل</div>
      ) : useExamReport && examReport ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { l: 'الطلاب', v: classStudents.length },
              { l: 'اختبروا', v: examStudentRows.filter((s) => s.examsTaken > 0).length },
              { l: 'متوسط %', v: examReport.summary ? `${examReport.summary.avgPct}%` : '—' },
              { l: 'نجاح %', v: examReport.summary ? `${examReport.summary.passRate}%` : '—' },
              { l: 'نتائج', v: examReport.summary?.resultCount ?? 0 },
            ].map((k) => (
              <div key={k.l} className="glass-card p-4 text-center">
                <p className="text-white/40 text-[10px]">{k.l}</p>
                <p className="text-gold-400 text-xl font-bold font-mono">{k.v}</p>
              </div>
            ))}
          </div>

          <div className="glass-card p-5">
            <h3 className="text-white font-semibold text-sm mb-4">المتوسط حسب المادة</h3>
            <div className="space-y-2">
              {examReport.subjects.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-4">لا توجد نتائج اختبارات</p>
              ) : (
                examReport.subjects.map((s) => (
                  <div key={s.subject_name} className="flex justify-between text-sm py-2 border-b border-white/5">
                    <span className="text-white/70">{s.subject_name}</span>
                    <span
                      className={clsx(
                        'font-mono font-bold',
                        s.avgPct >= 60 ? 'text-emerald-400' : 'text-red-400',
                      )}
                    >
                      {s.avgPct}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {renderStudentList()}
        </div>
      ) : pointsReport ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { l: 'الطلاب', v: classStudents.length },
              { l: 'نشاط ⌀', v: averagePerStudent(pointsReport.summary, 'activity') },
              { l: 'سلوك ⌀', v: averagePerStudent(pointsReport.summary, 'behavior') },
              { l: 'إنجاز ⌀', v: averagePerStudent(pointsReport.summary, 'achievement') },
              { l: 'موزون ⌀', v: averagePerStudent(pointsReport.summary, 'weighted') },
            ].map((k) => (
              <div key={k.l} className="glass-card p-4 text-center">
                <p className="text-white/40 text-[10px]">{k.l}</p>
                <p className="text-gold-400 text-xl font-bold font-mono">{k.v}</p>
              </div>
            ))}
          </div>

          <div className="glass-card p-5">
            <h3 className="text-white font-semibold text-sm mb-4">توزيع النقاط حسب النشاط</h3>
            <div className="space-y-2">
              {activityRows.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-4">لا توجد أنشطة مسجّلة</p>
              ) : (
                activityRows.map((a) => (
                  <div key={a.name} className="flex justify-between text-sm py-2 border-b border-white/5">
                    <span className="text-white/70">{a.name}</span>
                    <span className="text-gold-400 font-mono">{a.points} ن</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {renderStudentList()}
        </div>
      ) : null}

      {selectedExamStudent && (
        <StudentDetailModal
          student={selectedExamStudent}
          onClose={() => setSelectedExamStudent(null)}
        />
      )}

      {selectedPointsStudent && (
        <ClassStudentPointsModal
          student={selectedPointsStudent}
          onClose={() => setSelectedPointsStudent(null)}
        />
      )}
    </div>
  );
}
