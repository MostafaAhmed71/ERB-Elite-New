import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  BookOpen, Calendar, Eye, FileDown, Image, Layers, Search,
  Sparkles, Users, GraduationCap, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { academicHomeworkService } from '../../lib/academic/homeworkService';
import { academicWeeklyPlanService } from '../../lib/academic/weeklyPlanService';
import { academicTeacherService } from '../../lib/academic/teacherService';
import { academicConfigService } from '../../lib/academic/adminService';
import {
  buildScheduleSlotsByClass,
  classScheduleKey,
  scheduleInputsFromStaffSchedules,
} from '../../lib/academic/classScheduleSlots';
import { buildWeeklyGrid } from '../../lib/academic/weeklyPlanHelpers';
import { WeeklyPlanMonitorView, computeWeeklyGridStats } from '../../components/academic/WeeklyPlanFullGrid';
import {
  aggregateHomeworks,
  aggregateWeeklyPlans,
  type HomeworkGroup,
} from '../../lib/academic/exportTemplates';
import {
  exportHomeworkGroupPdf,
  exportHomeworkGroupPng,
  exportWeeklyPlanGroupPdf,
  exportWeeklyPlanGroupPng,
  openHomeworkPreview,
  openWeeklyPlanPreview,
} from '../../lib/academic/exportService';
import { openSampleHomeworkPreview, openSampleWeeklyPlanPreview } from '../../lib/academic/exportTemplates';
import {
  AcademicLayout,
  AcademicPageHeader,
  AcademicEmpty,
  AcademicBadge,
  AcademicChip,
  AcademicField,
  academicInputClass,
  academicBtnPrimary,
  academicBtnSecondary,
} from '../../components/academic/AcademicUi';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { useSemesterWeekCalendar } from '../../hooks/useSemesterWeekCalendar';
import {
  ACADEMIC_LEVEL_LABELS,
  formatSemesterWeek,
  SEMESTER_LABELS,
  weekOptionsForSemester,
  clampWeekToSemester,
  maxWeeksForSemester,
  formatGradeSection,
} from '../../lib/academic/constants';
import type { AcademicEducationLevel, AcademicSemester } from '../../lib/academic/types';

type Tab = 'homework' | 'weekly';

const SLOT_COLORS = [
  'from-[#7551FF]/30 to-[#422AFB]/10',
  'from-[#4481EB]/30 to-[#04BEFE]/10',
  'from-gold-500/25 to-gold-600/10',
  'from-[#01B574]/25 to-[#008F5D]/10',
  'from-rose-500/25 to-rose-600/10',
  'from-amber-500/25 to-amber-600/10',
];

function formatArDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

function StatPill({ icon: Icon, label, value, accent }: { icon: typeof BookOpen; label: string; value: number | string; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 min-w-0">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br', accent)}>
        <Icon className="w-5 h-5 text-white" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[#A3AED0] text-xs font-medium truncate">{label}</p>
        <p className="text-white text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

function HomeworkSlots({ group }: { group: HomeworkGroup }) {
  const slots = Array.from({ length: 6 }, (_, i) => group.homeworks[i] ?? null);
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {slots.map((hw, i) => (
        <div
          key={i}
          className={clsx(
            'rounded-lg px-2 py-2 text-center border min-h-[52px] flex flex-col justify-center',
            hw
              ? clsx('bg-gradient-to-br border-white/[0.08]', SLOT_COLORS[i])
              : 'bg-white/[0.02] border-dashed border-white/[0.08]',
          )}
        >
          {hw ? (
            <>
              <span className="text-[10px] text-[#A3AED0] truncate">{hw.teacher_name.split(' ')[0]}</span>
              <span className="text-xs font-bold text-white truncate">{hw.subject}</span>
            </>
          ) : (
            <span className="text-[10px] text-white/25">فارغ</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ExportCard({
  title,
  meta,
  children,
  exporting,
  onPreview,
  onPng,
  onPdf,
}: {
  title: string;
  meta: React.ReactNode;
  children?: React.ReactNode;
  exporting: boolean;
  onPreview: () => void;
  onPng: () => void;
  onPdf: () => void;
}) {
  return (
    <HorizonCard className="group overflow-hidden p-0 border border-white/[0.06] hover:border-gold-400/20 transition-all duration-300 hover:shadow-[0_24px_48px_rgba(0,0,0,0.35)]">
      <div className="flex-1 p-5 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="text-white font-bold text-lg leading-snug">{title}</h3>
            <div className="text-[#A3AED0] text-sm mt-1">{meta}</div>
          </div>
        </div>

        {children && <div className="mb-4">{children}</div>}

        <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.06]">
          <button type="button" className={academicBtnSecondary} onClick={onPreview}>
            <Eye className="w-4 h-4" /> معاينة
          </button>
          <button type="button" className={academicBtnSecondary} disabled={exporting} onClick={onPng}>
            <Image className="w-4 h-4" /> صورة PNG
          </button>
          <button type="button" className={academicBtnPrimary} disabled={exporting} onClick={onPdf}>
            <FileDown className="w-4 h-4" /> تحميل PDF
          </button>
        </div>
      </div>
    </HorizonCard>
  );
}

export function AcademicExportPage() {
  const { role } = useAuthStore();
  const deputyLevel = useAuthStore.getState().user?.staff_education_level as AcademicEducationLevel | undefined;
  const [tab, setTab] = useState<Tab>('homework');
  const [exporting, setExporting] = useState(false);
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [hwDate, setHwDate] = useState(new Date().toISOString().split('T')[0]);
  const weekCal = useSemesterWeekCalendar();
  const [planSemester, setPlanSemester] = useState<AcademicSemester>(weekCal.current.semester);
  const [planWeek, setPlanWeek] = useState(weekCal.current.week);

  useEffect(() => {
    if (weekCal.hasCalendar(weekCal.current.semester)) {
      setPlanSemester(weekCal.current.semester);
      setPlanWeek(weekCal.current.week);
    }
  }, [weekCal.current.semester, weekCal.current.week, weekCal]);
  const [search, setSearch] = useState('');

  const { data: homeworks = [], isLoading: hwLoading } = useQuery({
    queryKey: ['academic-export-hw'],
    queryFn: () =>
      role === 'deputy' && deputyLevel
        ? academicHomeworkService.listByLevel(deputyLevel)
        : academicHomeworkService.listAll(),
  });

  const { data: plans = [], isLoading: planLoading } = useQuery({
    queryKey: ['academic-export-plans'],
    queryFn: () =>
      role === 'deputy' && deputyLevel
        ? academicWeeklyPlanService.listByLevel(deputyLevel)
        : academicWeeklyPlanService.listAll(),
  });

  const { data: allSchedules = [] } = useQuery({
    queryKey: ['academic-all-schedules'],
    queryFn: () => academicTeacherService.listAllSchedulesWithTeacher(),
  });

  const scheduleSlotsByClass = useMemo(
    () => buildScheduleSlotsByClass(scheduleInputsFromStaffSchedules(allSchedules)),
    [allSchedules],
  );

  const { data: exportLayout } = useQuery({
    queryKey: ['export-template-layout'],
    queryFn: () => academicConfigService.getExportTemplateLayout(),
  });

  const hwGroups = useMemo(() => aggregateHomeworks(homeworks, hwDate), [homeworks, hwDate]);
  const planGroups = useMemo(
    () => aggregateWeeklyPlans(plans, { semester: planSemester, week_number: planWeek }),
    [plans, planSemester, planWeek],
  );

  const filteredHw = useMemo(() => {
    const q = search.trim();
    if (!q) return hwGroups;
    return hwGroups.filter(
      (g) =>
        g.section.includes(q) ||
        String(g.grade).includes(q) ||
        ACADEMIC_LEVEL_LABELS[g.education_level].includes(q) ||
        g.homeworks.some((h) => h.subject.includes(q)),
    );
  }, [hwGroups, search]);

  const filteredPlans = useMemo(() => {
    const q = search.trim();
    if (!q) return planGroups;
    return planGroups.filter(
      (g) =>
        g.section.includes(q) ||
        String(g.grade).includes(q) ||
        ACADEMIC_LEVEL_LABELS[g.education_level].includes(q),
    );
  }, [planGroups, search]);

  const totalHwSubjects = hwGroups.reduce((n, g) => n + g.homeworks.length, 0);
  const totalPlanTeachers = planGroups.reduce((n, g) => n + g.plans.length, 0);

  const runExport = async (key: string, fn: () => Promise<void>) => {
    setExporting(true);
    setExportingKey(key);
    try {
      await fn();
    } finally {
      setExporting(false);
      setExportingKey(null);
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(hwDate);
    d.setDate(d.getDate() + days);
    setHwDate(d.toISOString().split('T')[0]);
  };

  const isLoading = tab === 'homework' ? hwLoading : planLoading;
  const activeCount = tab === 'homework' ? filteredHw.length : filteredPlans.length;

  return (
    <AcademicLayout size="6xl">
      <AcademicPageHeader
        title="تصدير القوالب"
        subtitle="تجميع تلقائي حسب الفصل — مشاركة رقمية أولاً · PDF عند الحاجة"
        backTo="/academic"
        badge="رقمي · PDF · PNG"
      />

      <HorizonCard className="mb-4 border border-emerald-500/20 bg-emerald-500/5">
        <p className="text-sm font-semibold text-white">تفضيل رقمي (تقليل الورق)</p>
        <p className="text-xs text-surface-muted mt-1 leading-relaxed">
          شارك رابط{' '}
          <Link to="/parent/academic" className="text-gold-400 hover:underline">
            بوابة ولي الأمر
          </Link>{' '}
          أو انسخه من{' '}
          <Link to="/academic/templates" className="text-gold-400 hover:underline">
            مركز القوالب
          </Link>{' '}
          قبل الطباعة. التصدير PDF/PNG للأرشفة والاجتماعات فقط.
        </p>
      </HorizonCard>

      {/* Hero + إحصائيات */}
      <HorizonCard className="relative overflow-hidden mb-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(circle at 0% 0%, rgba(117,81,255,0.25) 0%, transparent 45%), radial-gradient(circle at 100% 100%, rgba(240,180,41,0.18) 0%, transparent 50%)',
          }}
        />
        <div className="relative flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/25">
              <Sparkles className="w-7 h-7 text-navy-950" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white">مركز تصدير القوالب الرسمية</h2>
              <p className="text-[#A3AED0] text-sm mt-1">
                اختر التاريخ أو الأسبوع، ثم حمّل القالب الجاهز لكل فصل
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatPill icon={Layers} label="قوالب واجبات اليوم" value={hwGroups.length} accent="from-[#7551FF] to-[#422AFB]" />
            <StatPill icon={BookOpen} label="مواد مُجمّعة" value={totalHwSubjects} accent="from-[#4481EB] to-[#04BEFE]" />
            <StatPill icon={Calendar} label="خطط هذا الأسبوع" value={planGroups.length} accent="from-gold-500 to-gold-600" />
            <StatPill icon={Users} label="معلمون في الخطط" value={totalPlanTeachers} accent="from-[#01B574] to-[#008F5D]" />
          </div>
        </div>
      </HorizonCard>

      {/* تبويبات */}
      <div className="flex flex-wrap gap-2 mb-5">
        <AcademicChip label="قوالب الواجبات" selected={tab === 'homework'} onClick={() => setTab('homework')} />
        <AcademicChip label="الخطط الأسبوعية" selected={tab === 'weekly'} onClick={() => setTab('weekly')} />
      </div>

      {/* شريط الفلاتر */}
      <HorizonCard className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          {tab === 'homework' ? (
            <div className="flex-1 space-y-3">
              <AcademicField label="تاريخ الواجبات">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white transition-colors" onClick={() => shiftDate(-1)} aria-label="اليوم السابق">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <input type="date" className={`${academicInputClass} max-w-[220px]`} value={hwDate} onChange={(e) => setHwDate(e.target.value)} />
                  <button type="button" className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white transition-colors" onClick={() => shiftDate(1)} aria-label="اليوم التالي">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button type="button" className={academicBtnSecondary} onClick={() => setHwDate(new Date().toISOString().split('T')[0])}>
                    اليوم
                  </button>
                </div>
              </AcademicField>
              <p className="text-xs text-[#A3AED0]">{formatArDate(hwDate)}</p>
            </div>
          ) : (
            <div className="flex-1 space-y-3">
              <AcademicField label="الفصل الدراسي والأسبوع">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className={`${academicInputClass} max-w-[220px]`}
                    value={planSemester}
                    onChange={(e) => {
                      const s = +e.target.value as AcademicSemester;
                      setPlanSemester(s);
                      setPlanWeek((w) => clampWeekToSemester(s, w));
                    }}
                  >
                    {(Object.entries(SEMESTER_LABELS) as [string, string][]).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                  <button type="button" className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white" onClick={() => setPlanWeek((w) => Math.max(1, w - 1))} disabled={planWeek <= 1}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <select className={`${academicInputClass} max-w-[160px] text-center`} value={planWeek} onChange={(e) => setPlanWeek(+e.target.value)}>
                    {weekOptionsForSemester(planSemester).map((w) => (
                      <option key={w} value={w}>الأسبوع {w}</option>
                    ))}
                  </select>
                  <button type="button" className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white" onClick={() => setPlanWeek((w) => Math.min(maxWeeksForSemester(planSemester), w + 1))} disabled={planWeek >= maxWeeksForSemester(planSemester)}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className={academicBtnSecondary}
                    onClick={() => {
                      setPlanSemester(weekCal.current.semester);
                      setPlanWeek(weekCal.current.week);
                    }}
                  >
                    الأسبوع الحالي
                  </button>
                </div>
              </AcademicField>
              <p className="text-xs text-[#A3AED0]">
                {formatSemesterWeek(planSemester, planWeek)}
                {weekCal.getRange(planSemester, planWeek) && (
                  <span className="mr-2"> — {weekCal.formatRange(weekCal.getRange(planSemester, planWeek)!)}</span>
                )}
                {' '}({SEMESTER_LABELS[planSemester]}: 1–{maxWeeksForSemester(planSemester)})
              </p>
            </div>
          )}

          <div className="flex-1 lg:max-w-xs">
            <AcademicField label="بحث (صف، فصل، مادة...)">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3AED0]" />
                <input
                  type="search"
                  placeholder="ابحث..."
                  className={clsx(academicInputClass, 'pr-10')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </AcademicField>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[#A3AED0]">النتائج:</span>
          <AcademicBadge variant="info">{activeCount} قالب</AcademicBadge>
          {tab === 'homework' && (
            <>
              <span className="text-[#A3AED0] text-xs mr-auto">كل فصل = 6 خانات مواد كحد أقصى</span>
              <button
                type="button"
                className={academicBtnSecondary}
                onClick={() => openSampleHomeworkPreview(exportLayout)}
              >
                <Eye className="w-4 h-4 inline ml-1" />
                معاينة تصميم وهمي
              </button>
            </>
          )}
          {tab === 'weekly' && (
            <>
              <span className="text-[#A3AED0] text-xs mr-auto">كل فصل = خطة واحدة مجمّعة من كل المعلمين</span>
              <button
                type="button"
                className={academicBtnSecondary}
                onClick={() => openSampleWeeklyPlanPreview(exportLayout)}
              >
                <Eye className="w-4 h-4 inline ml-1" />
                معاينة تصميم وهمي
              </button>
            </>
          )}
        </div>
      </HorizonCard>

      {/* المحتوى */}
      {isLoading ? (
        <TapHandLoader label="جاري تحميل القوالب..." />
      ) : tab === 'homework' ? (
        filteredHw.length === 0 ? (
          <div className="horizon-card rounded-[20px] bg-[#111c44] p-8 text-center border border-white/[0.04]">
            <BookOpen className="w-12 h-12 text-gold-400 mx-auto mb-4 opacity-80" />
            <p className="text-white font-semibold mb-2">
              {hwGroups.length === 0 ? 'لا واجبات لهذا التاريخ' : 'لا نتائج مطابقة للبحث'}
            </p>
            <p className="text-[#A3AED0] text-sm mb-6 max-w-md mx-auto">
              يمكنك معاينة شكل القالب بـ 6 واجبات وهمية (مواد ومعلمين) قبل إدخال بيانات حقيقية
            </p>
            <button
              type="button"
              className={academicBtnPrimary}
              onClick={() => openSampleHomeworkPreview(exportLayout)}
            >
              <Eye className="w-4 h-4 inline ml-1" />
              معاينة واجب وهمي — 6 مواد
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHw.map((g) => (
              <ExportCard
                key={g.key}
                title={formatGradeSection(g.education_level, g.grade, g.section)}
                meta={
                  <span className="flex flex-wrap items-center gap-2">
                    <AcademicBadge variant="gold">{g.homeworks.length}/6 مواد</AcademicBadge>
                    <span>{formatArDate(g.date)}</span>
                  </span>
                }
                exporting={exporting && exportingKey === g.key}
                onPreview={() => openHomeworkPreview(g, exportLayout)}
                onPng={() => runExport(g.key, () => exportHomeworkGroupPng(g, exportLayout))}
                onPdf={() => runExport(g.key, () => exportHomeworkGroupPdf(g, exportLayout))}
              >
                <div>
                  <p className="text-xs text-[#A3AED0] mb-2 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" /> توزيع المواد على القالب
                  </p>
                  <HomeworkSlots group={g} />
                </div>
              </ExportCard>
            ))}
          </div>
        )
      ) : filteredPlans.length === 0 ? (
        <div className="horizon-card rounded-[20px] bg-[#111c44] p-8 text-center border border-white/[0.04]">
          <Calendar className="w-12 h-12 text-gold-400 mx-auto mb-4 opacity-80" />
          <p className="text-white font-semibold mb-2">
            {planGroups.length === 0 ? 'لا خطط لهذا الأسبوع' : 'لا نتائج مطابقة للبحث'}
          </p>
          <p className="text-[#A3AED0] text-sm mb-6 max-w-md mx-auto">
            معاينة الخطة الأسبوعية الوهمية — 5 أيام × 6 حصص من 6 معلمين
          </p>
          <button
            type="button"
            className={academicBtnPrimary}
            onClick={() => openSampleWeeklyPlanPreview(exportLayout)}
          >
            <Eye className="w-4 h-4 inline ml-1" />
            معاينة خطة وهمية
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPlans.map((g) => {
            const mergedEntries = g.plans.flatMap((p) => p.entries);
            const scheduleSlots = scheduleSlotsByClass.get(
              classScheduleKey(g.education_level, g.grade, g.section),
            );
            const gridStats = scheduleSlots?.length
              ? computeWeeklyGridStats(buildWeeklyGrid(mergedEntries, scheduleSlots))
              : null;
            const contributors = [
              ...new Set(
                mergedEntries
                  .filter((e) => e.lesson_topic?.trim() && e.teacher_name)
                  .map((e) => e.teacher_name!),
              ),
            ];
            return (
              <ExportCard
                key={g.key}
                title={formatGradeSection(g.education_level, g.grade, g.section)}
                meta={
                  <span className="flex flex-wrap items-center gap-2">
                    <AcademicBadge variant="info">{formatSemesterWeek(g.semester, g.week_number)}</AcademicBadge>
                    {gridStats ? (
                      <>
                        <AcademicBadge variant="success">
                          {gridStats.filledCount}/{gridStats.scheduled} حصة
                        </AcademicBadge>
                        {gridStats.pending > 0 && (
                          <AcademicBadge variant="warning">{gridStats.pending} فارغة</AcademicBadge>
                        )}
                      </>
                    ) : (
                      <AcademicBadge variant="default">
                        {mergedEntries.filter((e) => e.lesson_topic?.trim()).length} حصة
                      </AcademicBadge>
                    )}
                    {contributors.length > 0 && (
                      <AcademicBadge variant="gold">{contributors.join(' · ')}</AcademicBadge>
                    )}
                  </span>
                }
                exporting={exporting && exportingKey === g.key}
                onPreview={() => openWeeklyPlanPreview(g, exportLayout)}
                onPng={() => runExport(g.key, () => exportWeeklyPlanGroupPng(g, exportLayout))}
                onPdf={() => runExport(g.key, () => exportWeeklyPlanGroupPdf(g, exportLayout))}
              >
                <WeeklyPlanMonitorView
                  entries={mergedEntries}
                  scheduleSlots={scheduleSlots}
                  showTeacher
                />
              </ExportCard>
            );
          })}
        </div>
      )}

      {exporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 backdrop-blur-sm">
          <HorizonCard className="px-8 py-6 text-center">
            <TapHandLoader label="جاري إنشاء الملف..." />
          </HorizonCard>
        </div>
      )}
    </AcademicLayout>
  );
}
