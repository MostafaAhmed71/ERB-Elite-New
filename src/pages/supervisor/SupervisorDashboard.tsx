import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  BookMarked,
  ClipboardList,
  HelpCircle,
  TrendingUp,
  Users,
  Flame,
  BarChart3,
  Calendar,
  Search,
  School,
  ScrollText,
  ChevronLeft,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { ROLE_LABELS } from '../../types';
import { containerVariants } from '../../lib/motionVariants';
import {
  computeClassAlerts,
  classifyWeeklyExams,
  findSubjectsWithoutDiagnostic,
  findWeakQuestions,
  buildQuestionMetaFromDetails,
} from '../../lib/supervisorInsights';
import { PageHeader, Panel, QuickLink, SectionTitle, TapHandLoader } from '../../components/ui';
import clsx from 'clsx';
import { fetchAcademicSnapshot } from '../../lib/unifiedDashboard';
import { DailyOpsInbox, type DailyOpsItem } from '../../components/shared/DailyOpsInbox';
import { academicHomeworkService } from '../../lib/academic/homeworkService';
import { academicWeeklyPlanService } from '../../lib/academic/weeklyPlanService';
import { ACADEMIC_LEVEL_LABELS, formatGradeLabel, formatSemesterWeek } from '../../lib/academic/constants';
import { formatHomeworkPageNumbers, normalizeHomeworkPageNumbers } from '../../lib/academic/homeworkHelpers';

function AlertList<T>({
  title,
  icon: Icon,
  empty,
  items,
  renderItem,
}: {
  title: string;
  icon: typeof AlertTriangle;
  empty: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <Panel className="p-5">
      <SectionTitle icon={Icon}>{title}</SectionTitle>
      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-6">{empty}</p>
        ) : (
          items.map((item, i) => <div key={i}>{renderItem(item)}</div>)
        )}
      </div>
    </Panel>
  );
}

export function SupervisorDashboard() {
  const { user, role } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['supervisor_dashboard'],
    queryFn: async () => {
      const [studentsRes, resultsRes, examsRes, gradeSubjectsRes, skillsRes, questionsRes] = await Promise.all([
        supabase.from('students').select('*').eq('is_active', true),
        supabase.from('exam_results').select('*, exams(title, subject_name, grade, exam_type)'),
        supabase.from('exams').select('*').order('created_at', { ascending: false }),
        supabase.from('grade_subjects').select('grade, subject_name'),
        supabase.from('skills').select('id, skill_name, subject_name'),
        supabase.from('questions').select('id, question_text, skill_id'),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (resultsRes.error) throw resultsRes.error;
      if (examsRes.error) throw examsRes.error;

      const students = studentsRes.data ?? [];
      const results = resultsRes.data ?? [];
      const exams = examsRes.data ?? [];
      const gradeSubjects = gradeSubjectsRes.data ?? [];
      const skills = skillsRes.data ?? [];
      const questions = questionsRes.data ?? [];

      const skillMap = new Map(skills.map((s) => [s.id, { skill_name: s.skill_name, subject_name: s.subject_name }]));
      const questionTexts = new Map(questions.map((q) => [q.id, q.question_text]));
      const questionMeta = buildQuestionMetaFromDetails(results, skillMap, questionTexts);

      return {
        classAlerts: computeClassAlerts(students, results),
        weeklyExams: classifyWeeklyExams(exams),
        weakQuestions: findWeakQuestions(results, questionMeta).slice(0, 8),
        missingDiagnostic: findSubjectsWithoutDiagnostic(gradeSubjects, exams).slice(0, 10),
        stats: {
          students: students.length,
          activeExams: exams.filter((e) => e.is_active).length,
          totalExams: exams.length,
        },
      };
    },
    staleTime: 60_000,
  });

  const { data: academic, isLoading: academicLoading } = useQuery({
    queryKey: ['supervisor', 'academic-snapshot'],
    queryFn: fetchAcademicSnapshot,
    staleTime: 120_000,
  });

  const [academicTab, setAcademicTab] = useState<'homework' | 'plans'>('homework');

  const { data: recentHomeworks = [], isLoading: hwLoading } = useQuery({
    queryKey: ['supervisor', 'recent-homeworks', user?.staff_education_level],
    queryFn: () => {
      if (user?.staff_education_level === 'middle' || user?.staff_education_level === 'high') {
        return academicHomeworkService.listByLevel(user.staff_education_level);
      }
      return academicHomeworkService.listAll();
    },
    staleTime: 60_000,
  });

  const { data: recentPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['supervisor', 'recent-plans', user?.staff_education_level],
    queryFn: () => {
      if (user?.staff_education_level === 'middle' || user?.staff_education_level === 'high') {
        return academicWeeklyPlanService.listByLevel(user.staff_education_level);
      }
      return academicWeeklyPlanService.listAll();
    },
    staleTime: 60_000,
  });

  const weeklyGrouped = useMemo(() => {
    if (!data) return { active: 0, ended: 0 };
    return {
      active: data.weeklyExams.filter((e) => e.status === 'active').length,
      ended: data.weeklyExams.filter((e) => e.status === 'ended').length,
    };
  }, [data]);

  const dailyOps = useMemo((): DailyOpsItem[] => {
    const items: DailyOpsItem[] = [];
    if (data?.classAlerts?.length) {
      items.push({
        id: 'class-alerts',
        title: `${data.classAlerts.length} تنبيه فصول`,
        detail: 'أداء أو مشاركة تحتاج متابعة',
        to: '/analytics/class',
        tone: 'warn',
      });
    }
    if (academic?.pendingParentRequests) {
      items.push({
        id: 'parent-req',
        title: `${academic.pendingParentRequests} طلب ولي أمر`,
        to: '/academic/observation-inbox',
        tone: 'warn',
      });
    }
    if (academic?.teachersMissingHomeworkToday && academic.teachersMissingHomeworkToday > 0) {
      items.push({
        id: 'missing-hw',
        title: `${academic.teachersMissingHomeworkToday} معلم بدون واجب اليوم`,
        detail: 'متابعة الواجبات اليومية للمراحل',
        to: '/academic/homework',
        tone: 'warn',
      });
    }
    if (weeklyGrouped.active > 0) {
      items.push({
        id: 'weekly-active',
        title: `${weeklyGrouped.active} اختبار نشط هذا الأسبوع`,
        to: '/exams',
        tone: 'info',
      });
    }
    return items;
  }, [data, academic, weeklyGrouped]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6" dir="rtl">
      <PageHeader
        title={user?.full_name ?? 'مشرف'}
        subtitle="لوحة المتابعة التربوية"
        role={role ? ROLE_LABELS[role] : undefined}
        avatar={user?.full_name?.charAt(0) ?? 'م'}
      />

      <DailyOpsInbox items={dailyOps} title="مهام اليوم" />

      {isLoading ? (
        <TapHandLoader label="جاري تحميل لوحة المشرف..." fullScreen />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4">
              <p className="text-white/40 text-xs">الطلاب</p>
              <p className="text-2xl font-bold text-white mt-1">{data?.stats.students ?? 0}</p>
            </div>
            <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4">
              <p className="text-white/40 text-xs">اختبارات نشطة</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{data?.stats.activeExams ?? 0}</p>
            </div>
            <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4">
              <p className="text-white/40 text-xs">نشطة هذا الأسبوع</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{weeklyGrouped.active}</p>
            </div>
            <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4">
              <p className="text-white/40 text-xs">منتهية هذا الأسبوع</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{weeklyGrouped.ended}</p>
            </div>
          </div>

          <Panel className="p-6">
            <SectionTitle icon={TrendingUp}>التشخيص التربوي</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-4">
              <QuickLink icon={BarChart3} label="مركز التحليلات" to="/analytics" />
              <QuickLink icon={ClipboardList} label="إدارة الاختبارات" to="/exams" />
              <QuickLink icon={HelpCircle} label="بنك الأسئلة" to="/questions" />
              <QuickLink icon={BookOpen} label="المواد حسب الصف" to="/grade-subjects" />
              <QuickLink icon={School} label="تقرير الفصول" to="/admin/classes-report" />
              <QuickLink icon={ScrollText} label="تقرير فصل" to="/admin/class-report" />
            </div>
          </Panel>

          <Panel className="p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <SectionTitle icon={BookOpen}>مدخل أكاديمي</SectionTitle>
              <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                عبر مركز الشؤون
              </span>
            </div>
            {academicLoading ? (
              <TapHandLoader label="جاري تحميل المؤشرات الأكاديمية..." />
            ) : (
              <>
                <div className="mobile-stat-grid mt-4">
                  <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4">
                    <p className="text-white/40 text-xs">واجبات اليوم</p>
                    <p className="text-2xl font-bold text-gold-400 mt-1">{academic?.homeworkToday ?? 0}</p>
                  </div>
                  <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4">
                    <p className="text-white/40 text-xs">معلمون بلا واجب</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">{academic?.teachersMissingHomeworkToday ?? 0}</p>
                  </div>
                  <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4">
                    <p className="text-white/40 text-xs">مراجعات معلّقة</p>
                    <p className="text-2xl font-bold text-cyan-400 mt-1">{academic?.pendingReviews ?? 0}</p>
                  </div>
                  <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4">
                    <p className="text-white/40 text-xs">طلبات أولياء الأمور</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{academic?.pendingParentRequests ?? 0}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-4">
                  <QuickLink icon={BookMarked} label="الواجبات المنزلية" to="/academic/homework" />
                  <QuickLink icon={Calendar} label="الخطط الأسبوعية" to="/academic/weekly-plans" />
                  <QuickLink icon={ClipboardList} label="صندوق الملاحظات" to="/academic/observation-inbox" />
                  <QuickLink icon={BookOpen} label="الشؤون الأكاديمية" to="/academic" />
                </div>

                {/* استعراض تفاعلي للواجبات والخطط الأسبوعية */}
                <div className="mt-6 border-t border-white/10 pt-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => setAcademicTab('homework')}
                        className={clsx(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                          academicTab === 'homework'
                            ? 'bg-gold-500 text-navy-950 shadow-sm'
                            : 'text-white/60 hover:text-white',
                        )}
                      >
                        <BookMarked className="w-3.5 h-3.5" />
                        الواجبات ({recentHomeworks.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAcademicTab('plans')}
                        className={clsx(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                          academicTab === 'plans'
                            ? 'bg-gold-500 text-navy-950 shadow-sm'
                            : 'text-white/60 hover:text-white',
                        )}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        الخطط الأسبوعية ({recentPlans.length})
                      </button>
                    </div>

                    <Link
                      to={academicTab === 'homework' ? '/academic/homework' : '/academic/weekly-plans'}
                      className="inline-flex items-center gap-1 text-xs text-gold-400 hover:text-gold-300 font-medium"
                    >
                      <span>عرض الكل في صفحة {academicTab === 'homework' ? 'الواجبات' : 'الخطط'}</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {academicTab === 'homework' ? (
                    hwLoading ? (
                      <TapHandLoader label="جاري تحميل الواجبات..." />
                    ) : recentHomeworks.length === 0 ? (
                      <div className="text-center py-6 bg-white/[0.02] border border-white/5 rounded-xl">
                        <BookMarked className="w-8 h-8 text-white/20 mx-auto mb-2" />
                        <p className="text-white/40 text-xs">لا توجد واجبات مسجّلة بعد</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {recentHomeworks.slice(0, 6).map((hw) => {
                          const pages = formatHomeworkPageNumbers(normalizeHomeworkPageNumbers(hw));
                          return (
                            <div
                              key={hw.id}
                              className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-gold-400/30 transition-all flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="text-xs font-bold text-gold-400 truncate">{hw.subject}</span>
                                  <span className="text-[10px] text-white/40">
                                    {new Date(hw.date).toLocaleDateString('ar-SA')}
                                  </span>
                                </div>
                                <p className="text-white text-xs font-medium line-clamp-1 mb-2">{hw.lesson_topic}</p>
                              </div>
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px] text-white/60">
                                <div className="flex items-center gap-1 truncate">
                                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">
                                    {formatGradeLabel(hw.education_level, hw.grade)}
                                  </span>
                                  {hw.sections?.[0] && (
                                    <span className="text-[10px] text-white/40">فصل {hw.sections.join('، ')}</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-emerald-400 shrink-0">{pages}</span>
                              </div>
                              <div className="mt-2 text-[10px] text-white/40 truncate">
                                المعلم: <span className="text-white/70">{hw.teacher_name}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    plansLoading ? (
                      <TapHandLoader label="جاري تحميل الخطط الأسبوعية..." />
                    ) : recentPlans.length === 0 ? (
                      <div className="text-center py-6 bg-white/[0.02] border border-white/5 rounded-xl">
                        <Calendar className="w-8 h-8 text-white/20 mx-auto mb-2" />
                        <p className="text-white/40 text-xs">لا توجد خطط أسبوعية مسجّلة بعد</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {recentPlans.slice(0, 6).map((plan) => (
                          <div
                            key={plan.id}
                            className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-gold-400/30 transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-xs font-bold text-white">
                                  {formatSemesterWeek(plan.semester ?? 1, plan.week_number)}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                  {ACADEMIC_LEVEL_LABELS[plan.education_level]}
                                </span>
                              </div>
                              <p className="text-gold-400 text-xs font-semibold mb-1">
                                {formatGradeLabel(plan.education_level, plan.grade)} — فصل {plan.section}
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
                              <span className="text-white/40 text-[10px]">
                                المعلم: <span className="text-white/70">{plan.teacher_name}</span>
                              </span>
                              <span className="text-white/60 text-[10px]">
                                {plan.entries?.length ?? 0} حصص
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AlertList
              title="فصول تحتاج متابعة (متوسط أقل من 60%)"
              icon={Users}
              empty="لا توجد فصول تحت الحد — أداء جيد"
              items={data?.classAlerts ?? []}
              renderItem={(c) => (
                <Link
                  key={`${c.grade}-${c.class_name}`}
                  to="/analytics/class"
                  className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/15 hover:bg-red-500/10 transition-all"
                >
                  <div>
                    <p className="text-white text-sm font-medium">
                      {c.grade} — فصل {c.class_name}
                    </p>
                    <p className="text-white/35 text-xs">{c.studentCount} طالب</p>
                  </div>
                  <span className="text-red-300 font-bold text-sm">{c.avgPct}%</span>
                </Link>
              )}
            />

            <AlertList
              title="اختبارات هذا الأسبوع"
              icon={ClipboardList}
              empty="لا اختبارات في آخر 7 أيام"
              items={(data?.weeklyExams ?? []).slice(0, 6)}
              renderItem={(e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/8"
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm truncate">{e.title}</p>
                    <p className="text-white/35 text-xs">
                      {e.grade} — {e.subject_name}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded-full border flex-shrink-0',
                      e.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                        : e.status === 'ended'
                          ? 'bg-white/5 text-white/40 border-white/10'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/25',
                    )}
                  >
                    {e.status === 'active' ? 'نشط' : e.status === 'ended' ? 'منتهي' : 'مجدول'}
                  </span>
                </div>
              )}
            />

            <AlertList
              title="أسئلة ضعيفة (p-value منخفض)"
              icon={HelpCircle}
              empty="لا أسئلة ضعيفة مكتشفة بعد"
              items={data?.weakQuestions ?? []}
              renderItem={(q) => (
                <Link
                  key={q.question_id}
                  to="/analytics/class"
                  className="block p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10"
                >
                  <p className="text-white text-sm line-clamp-1">{q.question_text}</p>
                  <p className="text-white/35 text-xs mt-1">
                    {q.subject_name} — {q.skill_name} — p={q.p_value}%
                  </p>
                </Link>
              )}
            />

            <AlertList
              title="مواد بلا اختبار تشخيصي"
              icon={Flame}
              empty="كل المواد لديها اختبار تشخيصي"
              items={data?.missingDiagnostic ?? []}
              renderItem={(m) => (
                <Link
                  key={`${m.grade}-${m.subject_name}`}
                  to="/exams"
                  className="flex items-center justify-between p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15 hover:bg-cyan-500/10"
                >
                  <p className="text-white text-sm">
                    {m.grade} — {m.subject_name}
                  </p>
                  <span className="text-cyan-300 text-xs">أنشئ تشخيصي</span>
                </Link>
              )}
            />
          </div>

          <Panel className="p-5">
            <SectionTitle icon={BarChart3}>روابط التحليل</SectionTitle>
            <p className="text-white/40 text-sm mt-2">
              لمقارنة الفصول، قائمة طلاب الخطر، وتصدير PDF شامل — انتقل إلى{' '}
              <Link to="/analytics/class" className="text-gold-400 hover:underline">
                التحليلات التعليمية
              </Link>
            </p>
          </Panel>
        </>
      )}
    </motion.div>
  );
}
