import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileDown, Copy, ChevronLeft, CalendarDays, BookOpen, Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { academicWeeklyPlanService } from '../../lib/academic/weeklyPlanService';
import { academicTeacherService } from '../../lib/academic/teacherService';
import {
  findWeeklyPlanConflicts,
  formatWeeklyPlanConflictMessage,
  filterEntriesForTeacher,
  mergeTeacherSlotsIntoMap,
  copyLessonTopicsToMatchingSlots,
  countCopyableLessonSlots,
} from '../../lib/academic/weeklyPlanHelpers';
import {
  buildScheduleSlotsByClass,
  classScheduleKey,
  scheduleInputsFromStaffSchedules,
  scheduleInputsFromTeacherSchedules,
} from '../../lib/academic/classScheduleSlots';
import {
  ACADEMIC_LEVEL_LABELS,
  formatGradeSection,
  formatGradeLabel,
  formatSemesterWeek,
  SEMESTER_LABELS,
  weekOptionsForSemester,
  clampWeekToSemester,
  weeklyPlanEntryKey,
} from '../../lib/academic/constants';
import {
  mergeTeacherClassRefs,
  findClassRef,
  type TeacherClassRef,
} from '../../lib/academic/teacherSetupHelpers';
import type { AcademicEducationLevel, AcademicSemester, AcademicTeacherSchedule, AcademicWeeklyPlan } from '../../lib/academic/types';
import {
  AcademicLayout,
  AcademicPageHeader,
  AcademicFormPanel,
  academicInputClass,
  academicBtnPrimary,
  academicBtnSecondary,
  AcademicBadge,
} from '../../components/academic/AcademicUi';
import {
  WeeklyPlanWeekGrid,
  entriesMapFromSchedule,
  entriesMapFromList,
  entriesListFromMap,
  type WeeklyPlanEntriesMap,
} from '../../components/academic/WeeklyPlanWeekGrid';
import { WeeklyPlanHistoryCard } from '../../components/academic/WeeklyPlanHistoryCard';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { getSupabaseErrorMessage } from '../../lib/academic/supabaseError';
import { canExportAcademicTemplates, isAcademicSupervisorView, isAcademicTeacher } from '../../lib/academic/roleHelpers';
import { useSemesterWeekCalendar } from '../../hooks/useSemesterWeekCalendar';
import { weekEntryBlockedMessage } from '../../lib/academic/semesterWeekCalendar';
import clsx from 'clsx';

const LAST_PLAN_KEY = 'academic_weekly_plan_last_context';

type WeeklyFillMode = 'each' | 'copy';

type PlanContext = {
  level: AcademicEducationLevel;
  grade: number;
  section: string;
  semester: AcademicSemester;
  week: number;
};

function loadLastContext(): Partial<PlanContext> {
  try {
    const raw = localStorage.getItem(LAST_PLAN_KEY);
    return raw ? (JSON.parse(raw) as Partial<PlanContext>) : {};
  } catch {
    return {};
  }
}

function saveLastContext(ctx: PlanContext) {
  localStorage.setItem(LAST_PLAN_KEY, JSON.stringify(ctx));
}

export function AcademicWeeklyPlansPage() {
  const { user, role } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isTeacher = isAcademicTeacher(role);
  const isSupervisor = isAcademicSupervisorView(role);
  const deputyLevel = user?.staff_education_level as AcademicEducationLevel | undefined;
  const weekCal = useSemesterWeekCalendar();
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AcademicWeeklyPlan | null>(null);
  const openedFromMyPlansRef = useRef<string | null>(null);

  const { data: schedules = [] } = useQuery({
    queryKey: ['academic-schedules', user?.id],
    queryFn: () => academicTeacherService.listSchedules(user!.id),
    enabled: !!user && isTeacher,
  });

  const { data: setup } = useQuery({
    queryKey: ['academic-teacher-setup', user?.id],
    queryFn: () => academicTeacherService.getSetup(user!.id),
    enabled: !!user && isTeacher,
  });

  const teacherClasses = useMemo(
    () => mergeTeacherClassRefs(setup, schedules),
    [setup, schedules],
  );

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['academic-plans', user?.id, role, teacherClasses.length],
    queryFn: () => {
      if (role === 'teacher' && user) {
        return academicWeeklyPlanService.listByTeacher(user.id);
      }
      if (role === 'deputy' && deputyLevel) return academicWeeklyPlanService.listByLevel(deputyLevel);
      return academicWeeklyPlanService.listAll();
    },
    enabled: !!user,
  });

  // جداول كل المعلمين (للوكيل/المدير) — لمعرفة المعلم المسؤول عن كل حصة
  const { data: allSchedules = [] } = useQuery({
    queryKey: ['academic-all-schedules'],
    queryFn: () => academicTeacherService.listAllSchedulesWithTeacher(),
    enabled: !!user && !isTeacher,
  });

  // خريطة: مفتاح الفصل → حصص الجدول المجدولة مع المعلم المسؤول
  const scheduleSlotsByClass = useMemo(() => {
    const inputs = isTeacher
      ? scheduleInputsFromTeacherSchedules(schedules, user?.full_name ?? 'أنت')
      : scheduleInputsFromStaffSchedules(allSchedules);
    return buildScheduleSlotsByClass(inputs);
  }, [isTeacher, schedules, allSchedules, user?.full_name]);

  const openCreate = () => {
    setEditingPlan(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPlan(null);
  };

  const [levelFilter, setLevelFilter] = useState<string>(() => {
    if (role === 'deputy' && deputyLevel) return deputyLevel;
    if (role === 'supervisor' && user?.staff_education_level && (user.staff_education_level === 'middle' || user.staff_education_level === 'high')) {
      return user.staff_education_level;
    }
    return 'all';
  });
  const [weekFilter, setWeekFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const sortedPlans = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          (b.semester ?? 1) - (a.semester ?? 1) ||
          b.week_number - a.week_number ||
          new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
            new Date(a.updated_at ?? a.created_at ?? 0).getTime(),
      ),
    [plans],
  );

  const filteredPlans = useMemo(() => {
    return sortedPlans.filter((plan) => {
      if (levelFilter !== 'all' && plan.education_level !== levelFilter) return false;
      if (weekFilter !== 'all' && plan.week_number !== weekFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTeacher = plan.teacher_name?.toLowerCase().includes(q);
        const matchGrade = formatGradeLabel(plan.education_level, plan.grade).toLowerCase().includes(q);
        const matchSection = `فصل ${plan.section}`.toLowerCase().includes(q);
        if (!matchTeacher && !matchGrade && !matchSection) return false;
      }
      return true;
    });
  }, [sortedPlans, levelFilter, weekFilter, searchQuery]);

  useEffect(() => {
    const editPlanId = (location.state as { editPlanId?: string } | null)?.editPlanId;
    if (!editPlanId || !plans.length || openedFromMyPlansRef.current === editPlanId) return;
    const plan = plans.find((p) => p.id === editPlanId);
    if (!plan) return;
    openedFromMyPlansRef.current = editPlanId;
    setEditingPlan(plan);
    setShowForm(true);
  }, [location.state, plans]);

  return (
    <AcademicLayout size="6xl">
      <AcademicPageHeader
        title="الخطط الأسبوعية"
        subtitle={
          isTeacher
            ? 'إنشاء خطة جديدة — خططك السابقة في «خططي»'
            : isSupervisor
              ? 'عرض خطط جميع المعلمين — بدون تعديل'
              : 'عرض خطط المعلمين مجمّعة حسب الفصل'
        }
        backTo={isSupervisor ? '/dashboard' : '/academic'}
        action={
          isTeacher ? (
            <div className="flex flex-wrap gap-2">
              <Link to="/academic/my-weekly-plans" className={academicBtnSecondary}>
                <BookOpen className="w-4 h-4" /> خططي
              </Link>
              <button type="button" className={academicBtnPrimary} onClick={openCreate}>
                <Plus className="w-4 h-4" /> خطة جديدة
              </button>
            </div>
          ) : canExportAcademicTemplates(role) ? (
            <Link to="/academic/export" className={academicBtnSecondary}>
              <FileDown className="w-4 h-4" /> تصدير القوالب
            </Link>
          ) : isSupervisor ? (
            <AcademicBadge variant="info">عرض فقط</AcademicBadge>
          ) : undefined
        }
      />

      {showForm && user && (
        <PlanForm
          teacherId={user.id}
          teacherName={user.full_name}
          schedules={schedules}
          existingPlans={plans}
          editingPlan={editingPlan}
          isTeacher={isTeacher}
          weekCal={weekCal}
          onDone={async () => {
            closeForm();
            await qc.invalidateQueries({ queryKey: ['academic-plans'] });
            qc.invalidateQueries({ queryKey: ['academic-class-plan'] });
            if (isTeacher) {
              navigate('/academic/my-weekly-plans');
            }
          }}
          onCancel={closeForm}
        />
      )}

      {isTeacher && !showForm && (
        <div className="horizon-card rounded-[20px] bg-[#111c44] p-8 text-center border border-white/[0.04]">
          <CalendarDays className="w-14 h-14 text-gold-400 mx-auto mb-4 opacity-80" />
          <h3 className="text-white text-lg font-bold mb-2">خطة أسبوعية جديدة</h3>
          <p className="text-[#A3AED0] text-sm mb-6 max-w-md mx-auto">
            أدخل حصص هذا الأسبوع — خططك المحفوظة سابقاً تجدها في «خططي» مع فلاتر البحث.
          </p>
          {weekCal.hasCalendar(weekCal.current.semester) && (
            <p className="text-xs text-[#01B574] mb-4">
              الأسبوع النشط: {formatSemesterWeek(weekCal.current.semester, weekCal.current.week)}
              {weekCal.getRange(weekCal.current.semester, weekCal.current.week) && (
                <span className="text-[#A3AED0] mr-1">
                  ({weekCal.formatRange(weekCal.getRange(weekCal.current.semester, weekCal.current.week)!)})
                </span>
              )}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" className={academicBtnPrimary} onClick={openCreate}>
              <Plus className="w-4 h-4" /> بدء خطة جديدة
            </button>
            <Link to="/academic/my-weekly-plans" className={academicBtnSecondary}>
              <BookOpen className="w-4 h-4" /> خططي
            </Link>
          </div>
        </div>
      )}

      {!isTeacher && (isLoading ? (
        <TapHandLoader label="جاري التحميل..." />
      ) : plans.length === 0 ? (
        <div className="horizon-card rounded-[20px] bg-[#111c44] p-8 text-center border border-white/[0.04]">
          <CalendarDays className="w-14 h-14 text-gold-400 mx-auto mb-4 opacity-80" />
          <h3 className="text-white text-lg font-bold mb-2">لا توجد خطط بعد</h3>
          <p className="text-[#A3AED0] text-sm">لم يرفع المعلمون أي خطة أسبوعية حتى الآن.</p>
        </div>
      ) : (
        <>
          {/* شريط الفلترة والبحث لغير المعلم (المشرف / الوكيل / المدير) */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">المرحلة:</span>
                <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setLevelFilter('all')}
                    className={clsx(
                      'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                      levelFilter === 'all'
                        ? 'bg-gold-500 text-navy-950 shadow-sm'
                        : 'text-white/60 hover:text-white',
                    )}
                  >
                    الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setLevelFilter('middle')}
                    className={clsx(
                      'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                      levelFilter === 'middle'
                        ? 'bg-gold-500 text-navy-950 shadow-sm'
                        : 'text-white/60 hover:text-white',
                    )}
                  >
                    المتوسطة
                  </button>
                  <button
                    type="button"
                    onClick={() => setLevelFilter('high')}
                    className={clsx(
                      'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                      levelFilter === 'high'
                        ? 'bg-gold-500 text-navy-950 shadow-sm'
                        : 'text-white/60 hover:text-white',
                    )}
                  >
                    الثانوية
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">الأسبوع:</span>
                <select
                  value={weekFilter}
                  onChange={(e) => setWeekFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold-400/50"
                >
                  <option value="all" className="bg-navy-900">كل الأسابيع</option>
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w} className="bg-navy-900">
                      الأسبوع {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-white/40 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالمعلم أو الصف أو الفصل..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-gold-400/50"
                />
              </div>
            </div>

            <span className="text-xs text-white/40">
              عرض {filteredPlans.length} من أصل {sortedPlans.length} خطة
            </span>
          </div>

          {filteredPlans.length === 0 ? (
            <div className="horizon-card rounded-[20px] bg-[#111c44] p-8 text-center border border-white/[0.04]">
              <CalendarDays className="w-10 h-10 text-gold-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-white text-base font-bold mb-1">لا توجد نتائج</h3>
              <p className="text-[#A3AED0] text-xs">لا توجد خطط أسبوعية تطابق الفلتر المحدّد.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlans.map((plan) => (
                <WeeklyPlanHistoryCard
                  key={plan.id}
                  plan={plan}
                  isTeacher={false}
                  showTeacher
                  scheduleSlots={scheduleSlotsByClass.get(
                    classScheduleKey(plan.education_level, plan.grade, plan.section),
                  )}
                />
              ))}
            </div>
          )}
        </>
      ))}
    </AcademicLayout>
  );
}

function PlanForm({
  teacherId,
  teacherName,
  schedules,
  existingPlans,
  editingPlan,
  isTeacher,
  weekCal,
  onDone,
  onCancel,
}: {
  teacherId: string;
  teacherName: string;
  schedules: AcademicTeacherSchedule[];
  existingPlans: AcademicWeeklyPlan[];
  editingPlan: AcademicWeeklyPlan | null;
  isTeacher: boolean;
  weekCal: ReturnType<typeof useSemesterWeekCalendar>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const defaults = weekCal.current;
  const saved = loadLastContext();
  const isEdit = !!editingPlan;

  const { data: setup } = useQuery({
    queryKey: ['academic-teacher-setup', teacherId],
    queryFn: () => academicTeacherService.getSetup(teacherId),
  });

  const teacherClasses = useMemo(
    () => mergeTeacherClassRefs(setup, schedules),
    [setup, schedules],
  );

  const gradeGroups = useMemo(() => {
    const out: { level: AcademicEducationLevel; grade: number; sections: string[] }[] = [];
    const seen = new Set<string>();
    for (const c of teacherClasses) {
      const k = `${c.level}_${c.grade}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({
        level: c.level,
        grade: c.grade,
        sections: teacherClasses
          .filter((x) => x.level === c.level && x.grade === c.grade)
          .map((x) => x.section),
      });
    }
    return out;
  }, [teacherClasses]);

  const pickInitialClass = (): TeacherClassRef | null => {
    if (editingPlan) {
      return {
        level: editingPlan.education_level,
        grade: editingPlan.grade,
        section: editingPlan.section,
      };
    }
    const fromSaved = findClassRef(
      teacherClasses,
      saved.level as AcademicEducationLevel,
      saved.grade ?? 0,
      saved.section ?? '',
    );
    if (fromSaved) return fromSaved;
    return teacherClasses[0] ?? null;
  };

  const initialClass = pickInitialClass();

  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1);
  const [level, setLevel] = useState<AcademicEducationLevel>(initialClass?.level ?? 'middle');
  const [grade, setGrade] = useState(initialClass?.grade ?? 1);
  const [section, setSection] = useState(initialClass?.section ?? 'أ');
  const [semester, setSemester] = useState<AcademicSemester>(
    (editingPlan?.semester ?? saved.semester ?? defaults.semester) as AcademicSemester,
  );
  const [week, setWeek] = useState(editingPlan?.week_number ?? saved.week ?? defaults.week);
  const [entriesMap, setEntriesMap] = useState<WeeklyPlanEntriesMap>({});
  const [saving, setSaving] = useState(false);
  const [fillMode, setFillMode] = useState<WeeklyFillMode>(isEdit ? 'copy' : 'each');
  const [targetSections, setTargetSections] = useState<string[]>(() =>
    initialClass ? [initialClass.section] : [],
  );
  const [entriesBySection, setEntriesBySection] = useState<Record<string, WeeklyPlanEntriesMap>>({});

  const initializedSectionsRef = useRef(new Set<string>());
  const sectionContextKeyRef = useRef('');

  const weekBlocked = false;

  const classPlanKey = useMemo(
    () => ({
      education_level: level,
      grade,
      section,
      semester,
      week_number: week,
    }),
    [level, grade, section, semester, week],
  );

  const { data: sharedPlan } = useQuery({
    queryKey: ['academic-class-plan', classPlanKey],
    queryFn: () => academicWeeklyPlanService.getClassPlan(classPlanKey),
    enabled: step === 2 && (isEdit || fillMode === 'copy'),
  });

  const { data: gradePlans } = useQuery({
    queryKey: ['academic-class-plans-grade', level, grade, semester, week, targetSections.join(',')],
    queryFn: async () =>
      Promise.all(
        targetSections.map(async (s) => ({
          section: s,
          plan: await academicWeeklyPlanService.getClassPlan({
            education_level: level,
            grade,
            section: s,
            semester,
            week_number: week,
          }),
        })),
      ),
    enabled: step === 2 && !isEdit && fillMode === 'each' && targetSections.length > 0,
  });

  useEffect(() => {
    if (isEdit || teacherClasses.length === 0) return;
    const secs = teacherClasses
      .filter((c) => c.level === level && c.grade === grade)
      .map((c) => c.section);
    const withSched = secs.filter((s) =>
      schedules.some((sc) => sc.education_level === level && sc.grade === grade && sc.section === s),
    );
    const chosen = withSched.length ? withSched : secs.slice(0, 1);
    setTargetSections((prev) => (prev.length ? prev : chosen));
  }, [isEdit, teacherClasses, level, grade, schedules]);

  const activeSchedule = useMemo(
    () => schedules.find((s) => s.education_level === level && s.grade === grade && s.section === section),
    [schedules, level, grade, section],
  );

  const appliedPlanKeyRef = useRef('');

  useEffect(() => {
    const ctxKey = `${level}|${grade}|${semester}|${week}|${targetSections.join(',')}`;
    if (sectionContextKeyRef.current !== ctxKey) {
      sectionContextKeyRef.current = ctxKey;
      initializedSectionsRef.current = new Set();
    }
  }, [level, grade, semester, week, targetSections]);

  useEffect(() => {
    if (step !== 2 || fillMode !== 'each' || isEdit || !gradePlans) return;
    const stamp = gradePlans.map((g) => `${g.section}:${g.plan?.updated_at ?? 'empty'}`).join('|');
    const applyKey = `each|${level}|${grade}|${semester}|${week}|${stamp}`;
    if (appliedPlanKeyRef.current === applyKey) return;
    appliedPlanKeyRef.current = applyKey;
    const next: Record<string, WeeklyPlanEntriesMap> = { ...entriesBySection };
    for (const s of targetSections) {
      if (initializedSectionsRef.current.has(s)) continue;
      const sched = scheduleForSection(s);
      if (!sched) continue;
      const base = entriesMapFromSchedule(sched.periods);
      const row = gradePlans.find((g) => g.section === s);
      const fromShared = mergeTeacherSlotsIntoMap(
        Object.keys(base),
        row?.plan?.entries ?? [],
        teacherId,
        row?.plan?.teacher_id,
      );
      const merged = { ...base };
      for (const key of Object.keys(base)) {
        if (fromShared[key]?.lesson_topic?.trim()) {
          merged[key] = { ...merged[key], lesson_topic: fromShared[key].lesson_topic };
        }
      }
      next[s] = merged;
      initializedSectionsRef.current.add(s);
    }
    setEntriesBySection(next);
  }, [step, fillMode, isEdit, gradePlans, targetSections, level, grade, semester, week, teacherId, schedules]);

  useEffect(() => {
    if (step !== 2 || !activeSchedule) return;
    if (!isEdit && fillMode === 'each') return;
    const planStamp =
      sharedPlan?.updated_at
      ?? editingPlan?.updated_at
      ?? (sharedPlan === undefined && !editingPlan ? 'loading' : 'empty');
    const applyKey = `copy|${JSON.stringify(classPlanKey)}|${planStamp}`;
    if (appliedPlanKeyRef.current === applyKey) return;
    if (planStamp === 'loading') return;
    appliedPlanKeyRef.current = applyKey;

    const base = entriesMapFromSchedule(activeSchedule.periods);
    const scheduleKeys = Object.keys(base);
    const fromShared = mergeTeacherSlotsIntoMap(
      scheduleKeys,
      sharedPlan?.entries ?? editingPlan?.entries ?? [],
      teacherId,
      sharedPlan?.teacher_id ?? editingPlan?.teacher_id,
    );
    setEntriesMap(() => {
      const merged = { ...base };
      for (const key of scheduleKeys) {
        if (fromShared[key]?.lesson_topic?.trim()) {
          merged[key] = { ...merged[key], lesson_topic: fromShared[key].lesson_topic };
        }
      }
      return merged;
    });
  }, [step, classPlanKey, activeSchedule, sharedPlan, editingPlan, teacherId]);

  const pickGrade = (lv: AcademicEducationLevel, g: number) => {
    setLevel(lv);
    setGrade(g);
    const secs = teacherClasses
      .filter((c) => c.level === lv && c.grade === g)
      .map((c) => c.section);
    const withSched = secs.filter((s) =>
      schedules.some((sc) => sc.education_level === lv && sc.grade === g && sc.section === s),
    );
    const chosen = withSched.length ? withSched : secs.slice(0, 1);
    setTargetSections(chosen);
    setSection(chosen[0] ?? secs[0] ?? 'أ');
    setFillMode(chosen.length > 1 ? 'each' : 'copy');
  };

  const toggleTargetSection = (s: string) => {
    setTargetSections((prev) => {
      const next = prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s];
      if (next.length === 0) return prev;
      if (!next.includes(section)) setSection(next[0]);
      return next;
    });
  };

  const scheduleForSection = (s: string) =>
    schedules.find((sc) => sc.education_level === level && sc.grade === grade && sc.section === s);

  useEffect(() => {
    if (isEdit || step !== 1) return;
    if (activeSchedule?.periods?.length) {
      setEntriesMap(entriesMapFromSchedule(activeSchedule.periods));
    } else {
      setEntriesMap({});
    }
  }, [activeSchedule, isEdit, step]);

  const filledEntries = useMemo(
    () => entriesListFromMap(entriesMap).filter((e) => e.lesson_topic.trim()),
    [entriesMap],
  );

  const goToTopics = () => {
    if (weekBlocked) {
      alert(weekEntryBlockedMessage(weekCal.config, semester, week));
      return;
    }
    const secs = isEdit ? [section] : targetSections;
    if (!secs.length) {
      alert('اختر فصلاً واحداً على الأقل');
      return;
    }
    for (const s of secs) {
      if (!findClassRef(teacherClasses, level, grade, s)) {
        alert('اختر فصولك المسجّلة فقط');
        return;
      }
      if (!scheduleForSection(s)) {
        alert(`أضف جدولك الدراسي لفصل ${s} أولاً من صفحة الجدول`);
        return;
      }
    }
    const primary = secs.includes(section) ? section : secs[0];
    setSection(primary);
    saveLastContext({ level, grade, section: primary, semester, week });
    setStep(2);
  };

  const copyFromPreviousWeek = () => {
    const prevWeek = week > 1 ? week - 1 : null;
    if (!prevWeek) {
      alert('لا يوجد أسبوع سابق في نفس الفصل الدراسي');
      return;
    }
    const prev =
      existingPlans.find(
        (p) =>
          p.education_level === level &&
          p.grade === grade &&
          p.section === section &&
          (p.semester ?? 1) === semester &&
          p.week_number === prevWeek,
      ) ?? null;
    if (!prev) {
      alert(`لا توجد خطة للأسبوع ${prevWeek} — ابدأ من الصفر أو املأ يدوياً`);
      return;
    }
    const prevMine = filterEntriesForTeacher(prev.entries, teacherId, prev.teacher_id);
    setEntriesMap((current) => {
      const merged = { ...current };
      for (const e of prevMine) {
        const key = weeklyPlanEntryKey(e.day, e.period);
        if (merged[key]) {
          merged[key] = { ...merged[key], lesson_topic: e.lesson_topic };
        }
      }
      return merged;
    });
    if (!isEdit && fillMode === 'each') {
      setEntriesBySection((maps) => {
        const next = { ...maps };
        for (const s of targetSections) {
          const prevPlan =
            existingPlans.find(
              (p) =>
                p.education_level === level &&
                p.grade === grade &&
                p.section === s &&
                (p.semester ?? 1) === semester &&
                p.week_number === prevWeek,
            ) ?? null;
          if (!prevPlan) continue;
          const mine = filterEntriesForTeacher(prevPlan.entries, teacherId, prevPlan.teacher_id);
          const merged = { ...(next[s] ?? {}) };
          for (const e of mine) {
            const key = weeklyPlanEntryKey(e.day, e.period);
            if (merged[key]) merged[key] = { ...merged[key], lesson_topic: e.lesson_topic };
          }
          next[s] = merged;
        }
        return next;
      });
    }
  };

  const filledBySection = useMemo(() => {
    const out: Record<string, ReturnType<typeof entriesListFromMap>> = {};
    for (const s of targetSections) {
      out[s] = entriesListFromMap(entriesBySection[s] ?? {}).filter((e) => e.lesson_topic.trim());
    }
    return out;
  }, [targetSections, entriesBySection]);

  const totalFilled =
    !isEdit && fillMode === 'each'
      ? Object.values(filledBySection).reduce((n, list) => n + list.length, 0)
      : filledEntries.length;

  const copyPreviewBySection = useMemo(() => {
    if (isEdit || fillMode !== 'copy' || targetSections.length <= 1) return {};
    const out: Record<string, number> = {};
    for (const s of targetSections) {
      if (s === section) {
        out[s] = filledEntries.length;
        continue;
      }
      const sched = scheduleForSection(s);
      out[s] = sched
        ? countCopyableLessonSlots(filledEntries, sched.periods)
        : 0;
    }
    return out;
  }, [isEdit, fillMode, targetSections, section, filledEntries, schedules, level, grade]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weekBlocked) {
      alert(weekEntryBlockedMessage(weekCal.config, semester, week));
      return;
    }

    const saveOne = async (sec: string, slots: typeof filledEntries) => {
      if (slots.length === 0) return null;
      const sched = scheduleForSection(sec);
      if (!sched) throw new Error(`لا جدول لفصل ${sec}`);
      const existing = (
        await academicWeeklyPlanService.getClassPlan({
          education_level: level,
          grade,
          section: sec,
          semester,
          week_number: week,
        })
      );
      const conflicts = findWeeklyPlanConflicts(
        existing?.entries ?? [],
        slots,
        teacherId,
        existing?.teacher_id,
      );
      if (conflicts.length) {
        throw new Error(`فصل ${sec}: ${formatWeeklyPlanConflictMessage(conflicts)}`);
      }
      return academicWeeklyPlanService.saveTeacherSlots(
        { education_level: level, grade, section: sec, semester, week_number: week },
        slots,
        teacherName,
      );
    };

    setSaving(true);
    try {
      let savedCount = 0;
      let savedSlots = 0;
      const copyWarnings: string[] = [];
      if (!isEdit && fillMode === 'each') {
        if (totalFilled === 0) {
          alert('أدخل موضوعاً لحصة واحدة على الأقل');
          return;
        }
        for (const s of targetSections) {
          const slots = filledBySection[s] ?? [];
          const saved = await saveOne(s, slots);
          if (saved) {
            savedCount += 1;
            savedSlots += slots.length;
          }
        }
      } else {
        if (!activeSchedule) {
          alert('أضف جدولك الدراسي لهذا الفصل أولاً');
          return;
        }
        if (filledEntries.length === 0) {
          alert('أدخل موضوعاً لحصة واحدة على الأقل');
          return;
        }
        const existingEntries = sharedPlan?.entries ?? editingPlan?.entries ?? [];
        const conflicts = findWeeklyPlanConflicts(
          existingEntries,
          filledEntries,
          teacherId,
          sharedPlan?.teacher_id ?? editingPlan?.teacher_id,
        );
        if (conflicts.length) {
          alert(formatWeeklyPlanConflictMessage(conflicts));
          return;
        }
        await academicWeeklyPlanService.saveTeacherSlots(classPlanKey, filledEntries, teacherName);
        savedCount = 1;
        savedSlots += filledEntries.length;
        if (!isEdit && fillMode === 'copy') {
          for (const s of targetSections) {
            if (s === section) continue;
            const sched = scheduleForSection(s);
            if (!sched) {
              copyWarnings.push(`فصل ${s}: لا يوجد جدول`);
              continue;
            }
            const copied = copyLessonTopicsToMatchingSlots(filledEntries, sched.periods);
            if (copied.length === 0) {
              copyWarnings.push(
                `فصل ${s}: لا مادة مشتركة — أدخل موضوعاً لمادة موجودة في جدول فصل ${s}`,
              );
              continue;
            }
            const saved = await saveOne(s, copied);
            if (saved) {
              savedCount += 1;
              savedSlots += copied.length;
            }
          }
        }
      }
      if (savedCount === 0) {
        throw new Error('لم يُحفظ أي موضوع — تحقق من إدخال المواضيع ثم أعد المحاولة');
      }
      saveLastContext({ level, grade, section, semester, week });
      if (copyWarnings.length) {
        toast.error(copyWarnings.join(' · '), { duration: 6000 });
      }
      toast.success(
        savedCount > 1
          ? `تم الحفظ في ${savedCount} فصول (${savedSlots} حصة) — راجع «خططي»`
          : `تم حفظ الخطة (${savedSlots} حصة) — راجع «خططي»`,
      );
      onDone();
    } catch (err) {
      alert(err instanceof Error ? err.message : getSupabaseErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mb-6">
      <AcademicFormPanel title={isEdit ? 'تعديل حصصك في الخطة المشتركة' : 'خطة أسبوعية جديدة'}>
        {/* خطوات */}
        {!isEdit && (
          <div className="flex items-center gap-2 mb-4">
            <StepBadge n={1} label="اختر الصف والأسبوع" active={step === 1} done={step > 1} />
            <div className="h-px flex-1 bg-white/10" />
            <StepBadge n={2} label="مواضيع الحصص" active={step === 2} done={false} />
          </div>
        )}

        {step === 1 && !isEdit ? (
          <div className="space-y-5">
            {teacherClasses.length === 0 ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-center">
                <p className="text-white font-semibold mb-2">لم تُحدَّد فصولك بعد</p>
                <p className="text-[#A3AED0] text-sm mb-4">
                  أكمل إعداد الملف التعليمي ليظهر لك فقط الصفوف والفصول التي تدرّسها
                </p>
                <Link to="/academic/teacher-setup" className={academicBtnPrimary}>
                  إعداد الملف التعليمي
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <span className="text-[#A3AED0] text-xs mb-2 block">اختر الصف</span>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {gradeGroups.map((g) => {
                      const selected = level === g.level && grade === g.grade;
                      return (
                        <button
                          key={`${g.level}_${g.grade}`}
                          type="button"
                          onClick={() => pickGrade(g.level, g.grade)}
                          className={clsx(
                            'text-right p-4 rounded-xl border transition-colors',
                            selected
                              ? 'bg-gold-500/15 border-gold-400/40 ring-1 ring-gold-400/30'
                              : 'bg-white/[0.03] border-white/[0.08] hover:border-gold-400/25',
                          )}
                        >
                          <p className="text-white font-bold text-sm">{formatGradeLabel(g.level, g.grade)}</p>
                          <p className="text-[#A3AED0] text-xs mt-1">
                            {ACADEMIC_LEVEL_LABELS[g.level]} · {g.sections.map((s) => `فصل ${s}`).join('، ')}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {gradeGroups.some((g) => g.level === level && g.grade === grade) && (
                  <div>
                    <span className="text-[#A3AED0] text-xs mb-2 block">فصول هذا الصف (ذات الجدول)</span>
                    <div className="flex flex-wrap gap-2">
                      {(gradeGroups.find((g) => g.level === level && g.grade === grade)?.sections ?? []).map(
                        (s) => {
                          const hasSched = !!scheduleForSection(s);
                          const on = targetSections.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={!hasSched}
                              onClick={() => toggleTargetSection(s)}
                              className={clsx(
                                'px-3 py-2 rounded-xl border text-sm font-semibold',
                                !hasSched && 'opacity-40 cursor-not-allowed',
                                on
                                  ? 'bg-[#01B574]/20 border-[#01B574]/40 text-white'
                                  : 'bg-white/[0.03] border-white/10 text-[#A3AED0]',
                              )}
                            >
                              فصل {s}
                              {!hasSched ? ' · بلا جدول' : ''}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

                {targetSections.length > 1 && (
                  <div>
                    <span className="text-[#A3AED0] text-xs mb-2 block">طريقة الإدخال</span>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFillMode('each')}
                        className={clsx(
                          'text-right p-3 rounded-xl border text-sm',
                          fillMode === 'each'
                            ? 'bg-gold-500/15 border-gold-400/40 text-white'
                            : 'bg-white/[0.03] border-white/10 text-[#A3AED0]',
                        )}
                      >
                        <span className="font-bold block">إدخال كل فصل على حدة</span>
                        <span className="text-xs opacity-80">كل حصص الأيام لكل الفصول في شاشة واحدة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFillMode('copy')}
                        className={clsx(
                          'text-right p-3 rounded-xl border text-sm',
                          fillMode === 'copy'
                            ? 'bg-gold-500/15 border-gold-400/40 text-white'
                            : 'bg-white/[0.03] border-white/10 text-[#A3AED0]',
                        )}
                      >
                        <span className="font-bold block">المواضيع متشابهة — نسخ</span>
                        <span className="text-xs opacity-80">تكتب موضوع كل مادة مرة وتُنسخ لكل حصص نفس المادة في باقي الفصول</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[#A3AED0] text-xs mb-2 block">الفصل الدراسي</span>
                    <select
                      className={academicInputClass}
                      value={semester}
                      onChange={(e) => {
                        const s = +e.target.value as AcademicSemester;
                        setSemester(s);
                        setWeek((w) => clampWeekToSemester(s, w));
                      }}
                    >
                      {(Object.entries(SEMESTER_LABELS) as [string, string][]).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                      ))}
                    </select>
                  </label>
                    <label className="block">
                      <span className="text-[#A3AED0] text-xs mb-2 block">الأسبوع</span>
                      <select className={academicInputClass} value={week} onChange={(e) => setWeek(+e.target.value)}>
                        {weekOptionsForSemester(semester).map((w) => {
                          const isCurrent =
                            weekCal.current.semester === semester && weekCal.current.week === w;
                          return (
                            <option key={w} value={w}>
                              الأسبوع {w}{isCurrent ? ' (الحالي)' : ''}
                            </option>
                          );
                        })}
                      </select>
                      {weekCal.getRange(semester, week) && (
                        <span className="block text-xs text-[#A3AED0] mt-1">
                          {weekCal.formatRange(weekCal.getRange(semester, week)!)}
                        </span>
                      )}
                    </label>
                </div>

                {weekBlocked && (
                  <p className="text-xs text-amber-300 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                    {weekEntryBlockedMessage(weekCal.config, semester, week)}
                  </p>
                )}

                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-sm text-[#A3AED0]">
                  {formatGradeLabel(level, grade)}
                  {targetSections.length ? ` — فصول ${targetSections.join('، ')}` : ''}
                  {' — '}
                  {formatSemesterWeek(semester, week)}
                </div>

                <button
                  type="button"
                  className={academicBtnPrimary}
                  onClick={goToTopics}
                  disabled={teacherClasses.length === 0 || weekBlocked || targetSections.length === 0}
                >
                  التالي — إدخال المواضيع
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gold-500/15 text-gold-300 border border-gold-400/25">
                  {!isEdit && fillMode === 'each'
                    ? `${formatGradeLabel(level, grade)} · ${targetSections.map((s) => `فصل ${s}`).join(' · ')}`
                    : formatGradeSection(level, grade, section)}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#7551FF]/15 text-[#A3AED0] border border-[#7551FF]/25">
                  {formatSemesterWeek(semester, week)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {!isEdit && (
                  <button type="button" className={academicBtnSecondary} onClick={() => setStep(1)}>
                    <ChevronLeft className="w-4 h-4" /> رجوع
                  </button>
                )}
                {week > 1 && (
                  <button type="button" className={academicBtnSecondary} onClick={copyFromPreviousWeek}>
                    <Copy className="w-4 h-4" /> نسخ من الأسبوع {week - 1}
                  </button>
                )}
              </div>
            </div>

            {!isEdit && fillMode === 'each' ? (
              <div className="space-y-6">
                {targetSections.map((s) => (
                  <div key={s} className="rounded-2xl border border-white/[0.08] p-3">
                    <p className="text-white font-bold text-sm mb-3">
                      {formatGradeSection(level, grade, s)}
                      <span className="text-[#A3AED0] font-normal text-xs mr-2">
                        {(filledBySection[s] ?? []).length} موضوع
                      </span>
                    </p>
                    <WeeklyPlanWeekGrid
                      schedulePeriods={scheduleForSection(s)?.periods ?? []}
                      entries={entriesBySection[s] ?? {}}
                      onChange={
                        weekBlocked
                          ? () => {}
                          : (map) => {
                              initializedSectionsRef.current.add(s);
                              setEntriesBySection((prev) => ({ ...prev, [s]: map }));
                            }
                      }
                      noSchedule={!scheduleForSection(s)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <WeeklyPlanWeekGrid
                schedulePeriods={activeSchedule?.periods ?? []}
                entries={entriesMap}
                onChange={weekBlocked ? () => {} : setEntriesMap}
                noSchedule={!activeSchedule}
              />
            )}

            {!isEdit && fillMode === 'copy' && targetSections.length > 1 && (
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 space-y-2">
                <p className="text-xs text-[#A3AED0]">
                  تُنسخ المواضيع من فصل {section} إلى باقي الفصول حسب <strong className="text-white/90">المادة</strong> — كل حصص «رياضيات» مثلاً تحصل على نفس الموضوع بغض النظر عن اليوم أو رقم الحصة.
                </p>
                <div className="flex flex-wrap gap-2">
                  {targetSections.map((s) => {
                    const n = copyPreviewBySection[s] ?? 0;
                    const isSource = s === section;
                    return (
                      <span
                        key={s}
                        className={clsx(
                          'text-xs px-2.5 py-1 rounded-full border',
                          isSource
                            ? 'bg-gold-500/15 border-gold-400/30 text-gold-300'
                            : n > 0
                              ? 'bg-[#01B574]/15 border-[#01B574]/30 text-[#01B574]'
                              : 'bg-white/[0.04] border-white/10 text-[#A3AED0]',
                        )}
                      >
                        فصل {s}: {isSource ? `${n} مُدخل` : n > 0 ? `${n} سيُنسخ` : 'لا مطابق'}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
              <button
                type="submit"
                className={academicBtnPrimary}
                disabled={
                  saving
                  || weekBlocked
                  || (!isEdit && fillMode === 'each'
                    ? targetSections.every((s) => !scheduleForSection(s))
                    : !activeSchedule)
                }
              >
                {saving ? 'جاري الحفظ...' : isEdit ? `حفظ التعديلات (${totalFilled})` : `حفظ وإرسال (${totalFilled})`}
              </button>
              <button type="button" className={academicBtnSecondary} onClick={onCancel}>إلغاء</button>
            </div>
          </div>
        )}
      </AcademicFormPanel>
    </form>
  );
}

function StepBadge({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={clsx('flex items-center gap-2 text-sm', active ? 'text-white' : 'text-[#A3AED0]')}>
      <span
        className={clsx(
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          active && 'bg-gold-500 text-navy-950',
          done && !active && 'bg-[#01B574] text-on-contrast',
          !active && !done && 'bg-white/10',
        )}
      >
        {done && !active ? '✓' : n}
      </span>
      <span className="font-medium hidden sm:inline">{label}</span>
    </div>
  );
}
