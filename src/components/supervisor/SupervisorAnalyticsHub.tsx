import { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Brain,
  Flame,
  LineChart,
  Download,
  School,
  ShieldAlert,
} from 'lucide-react';
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { useGradeClassCatalog, useSyncedGrade } from '../../hooks/useGradeClassCatalog';
import { GradeTabs } from '../shared/GradeTabs';
import {
  computeStudentWeaknesses,
  computeGradeDistribution,
  computeClassScoreStats,
  computeItemAnalysis,
  computeCompetencyHeatmap,
  computeGrowthReport,
  buildStudentExamTimeline,
  EXAM_TYPE_LABELS,
  type SkillWeakness,
} from '../../lib/examAnalytics';
import { printHtmlReport } from '../../lib/exportPdf';
import { compareClassesBySubject, computeAtRiskStudents } from '../../lib/supervisorInsights';
import type { DbExamResult, DbSkill, DbStudent, ExamResultDetail } from '../../types';
import { TapHandLoader } from '../ui/TapHandLoader';
import { ClassGradeDistributionChart } from './charts/ClassGradeDistributionChart';
import { skillsForGradeSubject } from './GradeSubjectPicker';
import { StudentDetailModal } from './StudentDetailModal';
import type { DbGradeSubject } from '../../types';
import clsx from 'clsx';

type TabId = 'class' | 'items' | 'heatmap' | 'growth' | 'compare' | 'classes' | 'at-risk';

const TAB_IDS = new Set<TabId>(['class', 'items', 'heatmap', 'growth', 'compare', 'classes', 'at-risk']);

interface ExamResultRow extends DbExamResult {
  exams: {
    title: string;
    subject_name: string | null;
    grade: string | null;
    exam_type?: string | null;
  } | null;
}

interface StudentWithStats extends DbStudent {
  avgPct: number | null;
  examsTaken: number;
  results: ExamResultRow[];
  weaknesses: SkillWeakness[];
}

const TABS: { id: TabId; label: string; icon: typeof TrendingUp }[] = [
  { id: 'class', label: 'أداء الفصل', icon: Users },
  { id: 'items', label: 'تحليل الأسئلة', icon: Brain },
  { id: 'heatmap', label: 'خريطة الكفاءات', icon: Flame },
  { id: 'growth', label: 'تقرير النمو', icon: LineChart },
  { id: 'classes', label: 'مقارنة الفصول', icon: School },
  { id: 'at-risk', label: 'طلاب الخطر', icon: ShieldAlert },
  { id: 'compare', label: 'مقارنة الطالب', icon: BarChart3 },
];

function scoreColor(pct: number) {
  if (pct >= 80) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (pct >= 60) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-red-500/15 text-red-300 border-red-500/30';
}

function heatColor(pct: number) {
  if (pct >= 80) return 'bg-emerald-500/40 text-emerald-100';
  if (pct >= 60) return 'bg-amber-500/35 text-amber-100';
  if (pct >= 40) return 'bg-orange-500/35 text-orange-100';
  return 'bg-red-500/40 text-red-100';
}

export function SupervisorAnalyticsHub() {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const activeTab: TabId = tabParam && TAB_IDS.has(tabParam as TabId) ? (tabParam as TabId) : 'class';

  useEffect(() => {
    if (tabParam && !TAB_IDS.has(tabParam as TabId)) {
      navigate('/analytics/class', { replace: true });
    }
  }, [tabParam, navigate]);

  const setActiveTab = (id: TabId) => navigate(`/analytics/${id}`);

  const { data: catalog } = useGradeClassCatalog();
  const [activeGrade, setActiveGrade] = useSyncedGrade(catalog?.grades ?? []);
  const classOptions = useMemo(
    () => (activeGrade ? catalog?.classesByGrade[activeGrade] ?? catalog?.allClasses ?? [] : []),
    [catalog, activeGrade]
  );
  const [activeClass, setActiveClass] = useSyncedGrade(classOptions);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithStats | null>(null);
  const [compareStudentId, setCompareStudentId] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  const { data: gradeSubjects = [] } = useQuery({
    queryKey: ['analytics-grade-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grade_subjects')
        .select('*')
        .order('grade')
        .order('subject_name');
      if (error) throw error;
      return data as DbGradeSubject[];
    },
  });

  const heatmapSubjectOptions = useMemo(
    () => gradeSubjects.filter((s) => s.grade === activeGrade).map((s) => s.subject_name),
    [gradeSubjects, activeGrade]
  );
  const [heatmapSubject, setHeatmapSubject] = useSyncedGrade(heatmapSubjectOptions);
  const [compareSubject, setCompareSubject] = useSyncedGrade(heatmapSubjectOptions);

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['analytics_students', activeGrade, activeClass],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('grade', activeGrade)
        .eq('class_name', activeClass)
        .order('full_name');
      if (error) throw error;
      return data as DbStudent[];
    },
    enabled: !!activeGrade && !!activeClass,
  });

  const { data: gradeSkills = [] } = useQuery({
    queryKey: ['analytics_skills', activeGrade],
    queryFn: async () => {
      const { data, error } = await supabase.from('skills').select('*').eq('grade', activeGrade);
      if (error) throw error;
      return data as DbSkill[];
    },
    enabled: !!activeGrade,
  });

  const studentIds = students.map((s) => s.id);

  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['analytics_results', activeGrade, studentIds],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('exam_results')
        .select('*, exams(title, subject_name, grade, exam_type)')
        .in('student_id', studentIds)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ExamResultRow[];
    },
    enabled: studentIds.length > 0,
  });

  const { data: gradeStudents = [] } = useQuery({
    queryKey: ['analytics_grade_students', activeGrade],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('grade', activeGrade)
        .order('full_name');
      if (error) throw error;
      return data as DbStudent[];
    },
    enabled: !!activeGrade && activeTab === 'classes',
  });

  const gradeStudentIds = gradeStudents.map((s) => s.id);

  const { data: gradeResults = [] } = useQuery({
    queryKey: ['analytics_grade_results', activeGrade, gradeStudentIds.length],
    queryFn: async () => {
      if (gradeStudentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('exam_results')
        .select('*, exams(title, subject_name, grade, exam_type)')
        .in('student_id', gradeStudentIds);
      if (error) throw error;
      return data as unknown as ExamResultRow[];
    },
    enabled: gradeStudentIds.length > 0 && activeTab === 'classes',
  });

  const { data: questionBank = [] } = useQuery({
    queryKey: ['analytics_questions', activeGrade],
    queryFn: async () => {
      const skillIds = gradeSkills.map((s) => s.id);
      if (skillIds.length === 0) return [];
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, skill_id, skills:skill_id(skill_name)')
        .in('skill_id', skillIds);
      if (error) throw error;
      return data as unknown as Array<{ id: string; question_text: string; skill_id: string; skills: { skill_name: string } | null }>;
    },
    enabled: gradeSkills.length > 0,
  });

  const filteredResults = useMemo(() => {
    if (!filterSubject) return allResults;
    return allResults.filter((r) => r.exams?.subject_name === filterSubject);
  }, [allResults, filterSubject]);

  const subjects = useMemo(
    () => [...new Set(allResults.map((r) => r.exams?.subject_name).filter(Boolean))] as string[],
    [allResults]
  );

  const studentsWithStats: StudentWithStats[] = useMemo(() => {
    return students.map((student) => {
      const results = allResults.filter((r) => r.student_id === student.id);
      const pcts = results.filter((r) => r.max_score > 0).map((r) => (Number(r.score) / r.max_score) * 100);
      const avgPct = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
      return {
        ...student,
        avgPct,
        examsTaken: results.length,
        results,
        weaknesses: computeStudentWeaknesses(results, gradeSkills),
      };
    });
  }, [students, allResults, gradeSkills]);

  const classPcts = studentsWithStats.filter((s) => s.avgPct !== null).map((s) => s.avgPct!);
  const classAvg = classPcts.length > 0 ? Math.round(classPcts.reduce((a, b) => a + b, 0) / classPcts.length) : null;
  const distribution = computeGradeDistribution(classPcts);
  const scoreStats = computeClassScoreStats(classPcts);
  const weakStudentsCount = studentsWithStats.filter((s) => s.weaknesses.length > 0).length;

  const questionMeta = useMemo(() => {
    const m = new Map<string, { text: string; skill_name: string }>();
    for (const q of questionBank) {
      m.set(q.id, { text: q.question_text, skill_name: q.skills?.skill_name ?? '—' });
    }
    return m;
  }, [questionBank]);

  const itemAnalysis = useMemo(
    () => computeItemAnalysis(filteredResults, questionMeta),
    [filteredResults, questionMeta]
  );

  const heatmapSubjectSkills = useMemo(
    () => skillsForGradeSubject(gradeSkills, activeGrade, heatmapSubject),
    [gradeSkills, activeGrade, heatmapSubject]
  );

  const heatmapResults = useMemo(
    () => allResults.filter((r) => r.exams?.subject_name === heatmapSubject),
    [allResults, heatmapSubject]
  );

  const heatmap = useMemo(
    () => computeCompetencyHeatmap(heatmapResults, heatmapSubjectSkills),
    [heatmapResults, heatmapSubjectSkills]
  );

  const studentNames = useMemo(() => new Map(students.map((s) => [s.id, s.full_name])), [students]);
  const growthRows = useMemo(() => computeGrowthReport(allResults, studentNames), [allResults, studentNames]);

  const classComparison = useMemo(
    () => compareClassesBySubject(gradeStudents, gradeResults, activeGrade, compareSubject),
    [gradeStudents, gradeResults, activeGrade, compareSubject],
  );

  const atRiskStudents = useMemo(
    () => computeAtRiskStudents(students, allResults, growthRows),
    [students, allResults, growthRows],
  );

  const compareStudent = studentsWithStats.find((s) => s.id === compareStudentId);
  const compareTimeline = compareStudent ? buildStudentExamTimeline(compareStudent.results) : [];

  const exportReport = () => {
    const distHtml = distribution.map((d) => `<tr><td>${d.level} (${d.label})</td><td>${d.count}</td></tr>`).join('');
    const heatmapHtml = heatmap
      .filter((c) => c.students_count > 0)
      .map((c) => `<tr><td>${c.skill_name}</td><td>${c.mastery_pct}%</td><td>${c.students_count}</td></tr>`)
      .join('');
    const growthHtml = growthRows
      .slice(0, 20)
      .map(
        (r) =>
          `<tr><td>${r.student_name}</td><td>${r.subject_name}</td><td>${r.diagnostic_pct ?? '—'}</td><td>${r.summative_pct ?? '—'}</td><td>${r.growth_pts ?? '—'}</td></tr>`,
      )
      .join('');
    const weakItemsHtml = itemAnalysis
      .filter((r) => r.p_value < 40)
      .slice(0, 15)
      .map((r) => `<tr><td>${r.question_text}</td><td>${r.p_value}%</td><td>${r.suggestion ?? '—'}</td></tr>`)
      .join('');
    const atRiskHtml = atRiskStudents
      .map((r) => `<tr><td>${r.student.full_name}</td><td>${r.avgPct ?? '—'}%</td><td>${r.reason}</td></tr>`)
      .join('');

    printHtmlReport(
      `تقرير شامل — ${activeGrade} — فصل ${activeClass}`,
      `<div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">متوسط الفصل</div><div class="kpi-value">${classAvg ?? '—'}%</div></div>
        <div class="kpi"><div class="kpi-label">الطلاب</div><div class="kpi-value">${students.length}</div></div>
        <div class="kpi"><div class="kpi-label">طلاب الخطر</div><div class="kpi-value">${atRiskStudents.length}</div></div>
      </div>
      <h2>توزيع الدرجات</h2><table><tr><th>النطاق</th><th>العدد</th></tr>${distHtml}</table>
      ${heatmapSubject ? `<h2>خريطة الكفاءات — ${heatmapSubject}</h2><table><tr><th>المهارة</th><th>الإتقان</th><th>طلاب</th></tr>${heatmapHtml || '<tr><td colspan="3">لا بيانات</td></tr>'}</table>` : ''}
      <h2>تقرير النمو (أعلى 20)</h2><table><tr><th>الطالب</th><th>المادة</th><th>تشخيصي</th><th>تحصيلي</th><th>النمو</th></tr>${growthHtml || '<tr><td colspan="5">لا بيانات</td></tr>'}</table>
      <h2>أسئلة تحتاج مراجعة</h2><table><tr><th>السؤال</th><th>p-value</th><th>اقتراح</th></tr>${weakItemsHtml || '<tr><td colspan="3">لا أسئلة ضعيفة</td></tr>'}</table>
      <h2>طلاب الخطر</h2><table><tr><th>الطالب</th><th>المتوسط</th><th>السبب</th></tr>${atRiskHtml || '<tr><td colspan="3">لا طلاب في خطر</td></tr>'}</table>`,
    );
  };

  const isLoading = studentsLoading || resultsLoading;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-gold-400" /> التحليلات التعليمية
        </h1>
        <button
          type="button"
          onClick={exportReport}
          className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-xl text-white/70 text-sm hover:bg-white/5"
        >
          <Download className="w-4 h-4" /> تصدير PDF
        </button>
      </div>

      <GradeTabs grades={catalog?.grades ?? []} activeGrade={activeGrade} onChange={setActiveGrade} />

      <div className="bg-navy-900/50 border border-white/8 rounded-2xl p-4">
        <p className="text-white/50 text-xs mb-3">الفصل</p>
        <div className="flex flex-wrap gap-2">
          {classOptions.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => setActiveClass(cls)}
              className={clsx(
                'w-12 h-12 rounded-xl text-sm font-bold border transition-all',
                activeClass === cls
                  ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              )}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-all',
              activeTab === t.id ? 'border-gold-400 text-gold-300' : 'border-transparent text-white/40 hover:text-white/70'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <TapHandLoader label="جاري تحميل التحليلات..." />
      ) : (
        <>
          {activeTab === 'class' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4">
                  <p className="text-white/40 text-xs">الطلاب</p>
                  <p className="text-2xl font-bold text-white mt-1">{students.length}</p>
                </div>
                <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4">
                  <p className="text-white/40 text-xs">متوسط الفصل</p>
                  <p className="text-2xl font-bold text-gold-400 mt-1">{classAvg !== null ? `${classAvg}%` : '—'}</p>
                </div>
                <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4">
                  <p className="text-white/40 text-xs">أجروا اختبارات</p>
                  <p className="text-2xl font-bold text-cyan-400 mt-1">
                    {studentsWithStats.filter((s) => s.examsTaken > 0).length}
                  </p>
                </div>
                <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4">
                  <p className="text-white/40 text-xs">نقاط ضعف</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">{weakStudentsCount}</p>
                </div>
              </div>

              {classPcts.length > 0 && (
                <ClassGradeDistributionChart
                  distribution={distribution}
                  stats={scoreStats}
                  classAvg={classAvg}
                  gradeLabel={activeGrade}
                  classLabel={activeClass}
                />
              )}

              <div className="bg-navy-900/50 border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="text-white font-semibold text-sm">طلاب الفصل</h2>
                </div>
                <div className="divide-y divide-white/5">
                  {studentsWithStats.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setSelectedStudent(student)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 text-right"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{student.full_name}</p>
                        <p className="text-white/35 text-xs">{student.examsTaken} اختبار</p>
                      </div>
                      {student.avgPct !== null && (
                        <span className={clsx('text-sm font-bold px-3 py-1 rounded-full border', scoreColor(student.avgPct))}>
                          {student.avgPct}%
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-4">
              {subjects.length > 0 && (
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                >
                  <option value="">كل المواد</option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
              {itemAnalysis.length === 0 ? (
                <p className="text-white/30 text-center py-12">لا توجد بيانات كافية لتحليل الأسئلة</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/5">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-right text-white/50">السؤال</th>
                        <th className="px-4 py-3 text-right text-white/50">المهارة</th>
                        <th className="px-4 py-3 text-right text-white/50">p-value</th>
                        <th className="px-4 py-3 text-right text-white/50">التمييز</th>
                        <th className="px-4 py-3 text-right text-white/50">اقتراح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {itemAnalysis.map((row) => (
                        <tr key={row.question_id} className="hover:bg-white/2">
                          <td className="px-4 py-3 text-white/80 max-w-xs truncate">{row.question_text}</td>
                          <td className="px-4 py-3 text-white/50">{row.skill_name}</td>
                          <td className="px-4 py-3">
                            <span className={clsx('px-2 py-0.5 rounded text-xs', scoreColor(row.p_value))}>{row.p_value}%</span>
                          </td>
                          <td className="px-4 py-3 text-white/60">{row.discrimination.toFixed(2)}</td>
                          <td className="px-4 py-3 text-amber-300/80 text-xs">{row.suggestion ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'heatmap' && (
            <div className="space-y-4">
              <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4">
                <p className="text-white/50 text-xs mb-3">
                  المادة — {activeGrade || 'اختر صفاً'}
                </p>
                {heatmapSubjectOptions.length === 0 ? (
                  <p className="text-white/30 text-sm">لا توجد مواد لهذا الصف. أضف مواد من صفحة «المواد حسب الصف».</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {heatmapSubjectOptions.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => setHeatmapSubject(subject)}
                        className={clsx(
                          'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                          heatmapSubject === subject
                            ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/8'
                        )}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!heatmapSubject ? (
                <p className="text-white/30 text-center py-12">اختر مادة لعرض خريطة الكفاءات</p>
              ) : heatmapSubjectSkills.length === 0 ? (
                <p className="text-white/30 text-center py-12">لا توجد مهارات مسجّلة لهذه المادة بعد</p>
              ) : heatmap.every((cell) => cell.students_count === 0) ? (
                <p className="text-white/30 text-center py-12">لا توجد نتائج اختبارات لهذه المادة في الفصل</p>
              ) : (
                <>
                  <p className="text-white/40 text-sm">
                    إتقان مهارات <span className="text-white/70">{heatmapSubject}</span> — فصل {activeClass}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {heatmap.map((cell) => (
                      <div
                        key={cell.skill_id}
                        className={clsx(
                          'p-4 rounded-xl border border-white/10 text-center',
                          cell.students_count === 0
                            ? 'bg-white/5 text-white/30'
                            : heatColor(cell.mastery_pct)
                        )}
                      >
                        <p className="font-semibold text-sm line-clamp-2">{cell.skill_name}</p>
                        <p className="text-2xl font-bold mt-2">
                          {cell.students_count === 0 ? '—' : `${cell.mastery_pct}%`}
                        </p>
                        <p className="text-[10px] opacity-70 mt-1">
                          {cell.students_count === 0 ? 'لا بيانات' : `${cell.students_count} طالب`}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'growth' && (
            <div className="overflow-x-auto rounded-2xl border border-white/5">
              {growthRows.length === 0 ? (
                <p className="text-white/30 text-center py-12">لا توجد أزواج تشخيصي/تحصيلي كافية</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-right text-white/50">الطالب</th>
                      <th className="px-4 py-3 text-right text-white/50">المادة</th>
                      <th className="px-4 py-3 text-right text-white/50">تشخيصي</th>
                      <th className="px-4 py-3 text-right text-white/50">تحصيلي</th>
                      <th className="px-4 py-3 text-right text-white/50">النمو</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {growthRows.map((row) => (
                      <tr key={`${row.student_id}-${row.subject_name}`}>
                        <td className="px-4 py-3 text-white">{row.student_name}</td>
                        <td className="px-4 py-3 text-white/50">{row.subject_name}</td>
                        <td className="px-4 py-3">{row.diagnostic_pct !== null ? `${row.diagnostic_pct}%` : '—'}</td>
                        <td className="px-4 py-3">{row.summative_pct !== null ? `${row.summative_pct}%` : '—'}</td>
                        <td className="px-4 py-3">
                          {row.growth_pts !== null ? (
                            <span className={clsx(
                              'font-bold',
                              row.trend === 'up' ? 'text-emerald-400' : row.trend === 'down' ? 'text-red-400' : 'text-white/50'
                            )}>
                              {row.growth_pts > 0 ? '+' : ''}{row.growth_pts}%
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="space-y-4">
              <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4">
                <p className="text-white/50 text-xs mb-3">المادة — {activeGrade}</p>
                <div className="flex flex-wrap gap-2">
                  {heatmapSubjectOptions.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => setCompareSubject(subject)}
                      className={clsx(
                        'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                        compareSubject === subject
                          ? 'bg-purple-500/20 border-purple-400/40 text-purple-300'
                          : 'bg-white/5 border-white/10 text-white/50 hover:text-white',
                      )}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>
              {!compareSubject ? (
                <p className="text-white/30 text-center py-12">اختر مادة لمقارنة الفصول</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/5">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-right text-white/50">الفصل</th>
                        <th className="px-4 py-3 text-right text-white/50">متوسط {compareSubject}</th>
                        <th className="px-4 py-3 text-right text-white/50">طلاب خضعوا للاختبار</th>
                        <th className="px-4 py-3 text-right text-white/50">عدد الاختبارات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {classComparison.map((row) => (
                        <tr key={row.class_name} className={row.class_name === activeClass ? 'bg-gold-500/5' : ''}>
                          <td className="px-4 py-3 text-white font-medium">
                            فصل {row.class_name}
                            {row.class_name === activeClass && (
                              <span className="text-gold-400 text-xs mr-2">(الحالي)</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.avgPct !== null ? (
                              <span className={clsx('font-bold', row.avgPct >= 60 ? 'text-emerald-400' : 'text-red-400')}>
                                {row.avgPct}%
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3 text-white/50">{row.studentsTested}</td>
                          <td className="px-4 py-3 text-white/50">{row.examCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'at-risk' && (
            <div className="space-y-4">
              <p className="text-white/40 text-sm">
                طلاب فصل {activeClass} بمتوسط أقل من 50% أو تراجع في تقرير النمو
              </p>
              {atRiskStudents.length === 0 ? (
                <p className="text-white/30 text-center py-12">لا يوجد طلاب في منطقة الخطر حالياً</p>
              ) : (
                <div className="space-y-2">
                  {atRiskStudents.map((row) => (
                    <button
                      key={row.student.id}
                      type="button"
                      onClick={() => {
                        const full = studentsWithStats.find((s) => s.id === row.student.id);
                        if (full) setSelectedStudent(full);
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/15 hover:bg-red-500/10 text-right"
                    >
                      <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">{row.student.full_name}</p>
                        <p className="text-white/35 text-xs mt-0.5">{row.reason}</p>
                      </div>
                      {row.avgPct !== null && (
                        <span className={clsx('text-sm font-bold px-3 py-1 rounded-full border', scoreColor(row.avgPct))}>
                          {row.avgPct}%
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="space-y-4">
              <select
                value={compareStudentId}
                onChange={(e) => setCompareStudentId(e.target.value)}
                className="w-full max-w-md bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
              >
                <option value="">اختر طالباً للمقارنة</option>
                {studentsWithStats.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
              {compareStudent && compareTimeline.length > 0 ? (
                <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-5 space-y-4">
                  <h2 className="text-white font-semibold">{compareStudent.full_name} — عبر الاختبارات</h2>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReLineChart data={compareTimeline}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="title" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="pct" stroke="#22d3ee" strokeWidth={2} name="%" />
                      </ReLineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {compareTimeline.map((pt) => (
                      <div key={pt.exam_id} className="flex justify-between text-sm p-2 bg-white/3 rounded-lg">
                        <span className="text-white/70">{pt.title} <span className="text-white/30">({EXAM_TYPE_LABELS[pt.exam_type]})</span></span>
                        <span className={clsx('font-bold', scoreColor(pt.pct).split(' ')[1])}>{pt.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : compareStudentId ? (
                <p className="text-white/30 text-center py-8">لا توجد نتائج لهذا الطالب</p>
              ) : null}
            </div>
          )}
        </>
      )}

      {selectedStudent && (
        <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}
