import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileDown, Copy, ChevronLeft, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { academicWeeklyPlanService } from '../../lib/academic/weeklyPlanService';
import { academicTeacherService } from '../../lib/academic/teacherService';
import {
  findWeeklyPlanConflicts,
  formatWeeklyPlanConflictMessage,
  filterEntriesForTeacher,
  mergeTeacherSlotsIntoMap,
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
  getDefaultSemesterWeek,
  formatSemesterWeek,
  SEMESTER_LABELS,
  weekOptionsForSemester,
  clampWeekToSemester,
  weeklyPlanEntryKey,
} from '../../lib/academic/constants';
import {
  mergeTeacherClassRefs,
  findClassRef,
  scheduleSlotCount,
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
  const qc = useQueryClient();
  const isTeacher = isAcademicTeacher(role);
  const isSupervisor = isAcademicSupervisorView(role);
  const deputyLevel = user?.staff_education_level as AcademicEducationLevel | undefined;
  const weekCal = useSemesterWeekCalendar();
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AcademicWeeklyPlan | null>(null);

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
        return academicWeeklyPlanService.listForTeacherClasses(user.id, teacherClasses);
      }
      if (role === 'deputy' && deputyLevel) return academicWeeklyPlanService.listByLevel(deputyLevel);
      return academicWeeklyPlanService.listAll();
    },
    enabled: !!user && (role !== 'teacher' || teacherClasses.length > 0 || !!setup),
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

  const openEdit = (plan: AcademicWeeklyPlan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPlan(null);
  };

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

  return (
    <AcademicLayout size="6xl">
      <AcademicPageHeader
        title="الخطط الأسبوعية"
        subtitle={
          isTeacher
            ? 'دقيقتان فقط — اختر الأسبوع ثم اكتب مواضيع حصصك بالترتيب'
            : isSupervisor
              ? 'عرض خطط جميع المعلمين — بدون تعديل'
              : 'عرض خطط المعلمين مجمّعة حسب الفصل'
        }
        backTo={isSupervisor ? '/dashboard' : '/academic'}
        action={
          isTeacher ? (
            <button type="button" className={academicBtnPrimary} onClick={openCreate}>
              <Plus className="w-4 h-4" /> خطة جديدة
            </button>
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
          onDone={() => {
            closeForm();
            qc.invalidateQueries({ queryKey: ['academic-plans'] });
            qc.invalidateQueries({ queryKey: ['academic-class-plan'] });
          }}
          onCancel={closeForm}
        />
      )}

      {isLoading ? (
        <TapHandLoader label="جاري التحميل..." />
      ) : plans.length === 0 && !showForm ? (
        <div className="horizon-card rounded-[20px] bg-[#111c44] p-8 text-center border border-white/[0.04]">
          <CalendarDays className="w-14 h-14 text-gold-400 mx-auto mb-4 opacity-80" />
          <h3 className="text-white text-lg font-bold mb-2">ابدأ خطة هذا الأسبوع</h3>
          <p className="text-[#A3AED0] text-sm mb-6 max-w-md mx-auto">
            لا حاجة لملء جدول كامل — فقط حصصك تظهر في قائمة بسيطة. اضغط Enter للانتقال للحصة التالية.
          </p>
          {isTeacher && (
            <button type="button" className={academicBtnPrimary} onClick={openCreate}>
              <Plus className="w-4 h-4" /> إنشاء أول خطة
            </button>
          )}
        </div>
      ) : plans.length === 0 ? null : (
        <div className="space-y-3">
          <p className="text-[#A3AED0] text-sm mb-1">
            {sortedPlans.length} خطة مشتركة — الأحدث أولاً
          </p>
          {isTeacher && weekCal.hasCalendar(weekCal.current.semester) && (
            <p className="text-xs text-[#01B574] mb-2 flex items-center gap-1">
              الأسبوع النشط: {formatSemesterWeek(weekCal.current.semester, weekCal.current.week)}
              {weekCal.getRange(weekCal.current.semester, weekCal.current.week) && (
                <span className="text-[#A3AED0]">
                  ({weekCal.formatRange(weekCal.getRange(weekCal.current.semester, weekCal.current.week)!)})
                </span>
              )}
            </p>
          )}
          {sortedPlans.map((plan) => (
            <WeeklyPlanHistoryCard
              key={plan.id}
              plan={plan}
              isTeacher={isTeacher}
              teacherId={isTeacher ? user?.id : undefined}
              showTeacher={!isTeacher}
              scheduleSlots={scheduleSlotsByClass.get(
                classScheduleKey(plan.education_level, plan.grade, plan.section),
              )}
              onEdit={isTeacher ? () => openEdit(plan) : undefined}
              onDelete={
                isTeacher && user
                  ? () => {
                      if (confirm('حذف حصصك من هذه الخطة المشتركة؟ (لن تُحذف حصص المعلمين الآخرين)')) {
                        academicWeeklyPlanService
                          .clearTeacherSlots(
                            {
                              education_level: plan.education_level,
                              grade: plan.grade,
                              section: plan.section,
                              semester: (plan.semester ?? 1) as AcademicSemester,
                              week_number: plan.week_number,
                            },
                            user.full_name,
                          )
                          .then(() => qc.invalidateQueries({ queryKey: ['academic-plans'] }));
                      }
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
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

  const calendarLocked =
    isTeacher && weekCal.hasCalendar(weekCal.current.semester);

  useEffect(() => {
    if (!isTeacher || isEdit) return;
    if (weekCal.hasCalendar(weekCal.current.semester)) {
      setSemester(weekCal.current.semester);
      setWeek(weekCal.current.week);
    }
  }, [isTeacher, isEdit, weekCal.current.semester, weekCal.current.week, weekCal]);

  const weekBlocked =
    isTeacher
    && weekCal.hasCalendar(semester)
    && !weekCal.isWeekOpen(semester, week);

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
    enabled: step === 2,
  });

  useEffect(() => {
    if (isEdit || teacherClasses.length === 0) return;
    const valid = findClassRef(teacherClasses, level, grade, section);
    if (!valid) {
      const first = teacherClasses[0];
      setLevel(first.level);
      setGrade(first.grade);
      setSection(first.section);
    }
  }, [teacherClasses, level, grade, section, isEdit]);

  const activeSchedule = useMemo(
    () => schedules.find((s) => s.education_level === level && s.grade === grade && s.section === section),
    [schedules, level, grade, section],
  );

  const appliedPlanKeyRef = useRef('');

  useEffect(() => {
    if (step !== 2 || !activeSchedule) return;
    const planStamp =
      sharedPlan?.updated_at
      ?? editingPlan?.updated_at
      ?? (sharedPlan === undefined && !editingPlan ? 'loading' : 'empty');
    const applyKey = `${JSON.stringify(classPlanKey)}|${planStamp}`;
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

  const selectClass = (ref: TeacherClassRef) => {
    setLevel(ref.level);
    setGrade(ref.grade);
    setSection(ref.section);
  };

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

  const slotCount = useMemo(() => scheduleSlotCount(activeSchedule), [activeSchedule]);

  const goToTopics = () => {
    if (weekBlocked) {
      alert(weekEntryBlockedMessage(weekCal.config, semester, week));
      return;
    }
    if (!findClassRef(teacherClasses, level, grade, section)) {
      alert('اختر أحد فصولك المسجّلة');
      return;
    }
    if (!activeSchedule) {
      alert('أضف جدولك الدراسي لهذا الفصل أولاً من صفحة الجدول');
      return;
    }
    saveLastContext({ level, grade, section, semester, week });
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
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchedule) return;
    if (weekBlocked) {
      alert(weekEntryBlockedMessage(weekCal.config, semester, week));
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

    setSaving(true);
    try {
      await academicWeeklyPlanService.saveTeacherSlots(classPlanKey, filledEntries, teacherName);
      saveLastContext({ level, grade, section, semester, week });
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
            <StepBadge n={1} label="اختر الفصل والأسبوع" active={step === 1} done={step > 1} />
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
                <Link to="/academic/setup" className={academicBtnPrimary}>
                  إعداد الملف التعليمي
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <span className="text-[#A3AED0] text-xs mb-2 block">فصولك — اختر الفصل</span>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {teacherClasses.map((c) => {
                      const selected = level === c.level && grade === c.grade && section === c.section;
                      const sched = schedules.find(
                        (s) =>
                          s.education_level === c.level && s.grade === c.grade && s.section === c.section,
                      );
                      const slots = scheduleSlotCount(sched);
                      return (
                        <button
                          key={`${c.level}_${c.grade}_${c.section}`}
                          type="button"
                          onClick={() => selectClass(c)}
                          className={clsx(
                            'text-right p-4 rounded-xl border transition-colors',
                            selected
                              ? 'bg-gold-500/15 border-gold-400/40 ring-1 ring-gold-400/30'
                              : 'bg-white/[0.03] border-white/[0.08] hover:border-gold-400/25',
                          )}
                        >
                          <p className="text-white font-bold text-sm">{formatGradeSection(c.level, c.grade, c.section)}</p>
                          <p className="text-[#A3AED0] text-xs mt-1">
                            {ACADEMIC_LEVEL_LABELS[c.level]}
                            {slots > 0 ? (
                              <span className="text-[#01B574] mr-1">· {slots} حصة</span>
                            ) : (
                              <span className="text-amber-400 mr-1">· يحتاج جدول</span>
                            )}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[#A3AED0] text-xs mb-2 block">الفصل الدراسي</span>
                    <select
                      className={academicInputClass}
                      value={semester}
                      disabled={calendarLocked}
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
                  {calendarLocked ? (
                    <div className="block">
                      <span className="text-[#A3AED0] text-xs mb-2 block">الأسبوع (تلقائي)</span>
                      <div className="rounded-xl bg-[#01B574]/10 border border-[#01B574]/25 px-3 py-2.5 text-sm text-white">
                        {formatSemesterWeek(semester, week)}
                        {weekCal.getRange(semester, week) && (
                          <span className="block text-xs text-[#A3AED0] mt-1">
                            {weekCal.formatRange(weekCal.getRange(semester, week)!)}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <label className="block">
                      <span className="text-[#A3AED0] text-xs mb-2 block">الأسبوع</span>
                      <select className={academicInputClass} value={week} onChange={(e) => setWeek(+e.target.value)}>
                        {weekOptionsForSemester(semester).map((w) => {
                          const expired = isTeacher && weekCal.isWeekExpired(semester, w);
                          return (
                            <option key={w} value={w} disabled={expired}>
                              الأسبوع {w}{expired ? ' (انتهى)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  )}
                </div>

                {weekBlocked && (
                  <p className="text-xs text-amber-300 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                    {weekEntryBlockedMessage(weekCal.config, semester, week)}
                  </p>
                )}

                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-sm text-[#A3AED0]">
                  {formatGradeSection(level, grade, section)} — {formatSemesterWeek(semester, week)}
                  {activeSchedule ? (
                    <span className="text-[#01B574] mr-2">· {slotCount} حصة لك</span>
                  ) : (
                    <span className="text-amber-400 mr-2">· أضف جدولك من صفحة الجدول الدراسي</span>
                  )}
                </div>

                <button
                  type="button"
                  className={academicBtnPrimary}
                  onClick={goToTopics}
                  disabled={teacherClasses.length === 0 || weekBlocked}
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
                  {formatGradeSection(level, grade, section)}
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

            <WeeklyPlanWeekGrid
              schedulePeriods={activeSchedule?.periods ?? []}
              entries={entriesMap}
              onChange={weekBlocked ? () => {} : setEntriesMap}
              noSchedule={!activeSchedule}
            />

            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
              <button type="submit" className={academicBtnPrimary} disabled={saving || !activeSchedule || weekBlocked}>
                {saving ? 'جاري الحفظ...' : isEdit ? `حفظ التعديلات (${filledEntries.length})` : `حفظ وإرسال (${filledEntries.length})`}
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
          done && !active && 'bg-[#01B574] text-white',
          !active && !done && 'bg-white/10',
        )}
      >
        {done && !active ? '✓' : n}
      </span>
      <span className="font-medium hidden sm:inline">{label}</span>
    </div>
  );
}
