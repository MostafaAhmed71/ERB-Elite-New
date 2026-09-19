import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, FilterX } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { academicWeeklyPlanService } from '../../lib/academic/weeklyPlanService';
import { academicTeacherService } from '../../lib/academic/teacherService';
import {
  ACADEMIC_LEVEL_LABELS,
  formatGradeLabel,
  formatGradeSection,
  formatSemesterWeek,
  SEMESTER_LABELS,
} from '../../lib/academic/constants';
import {
  filterEntriesForTeacher,
  normalizePlanEntries,
  sameTeacherId,
  teacherFilledSlotCount,
  teacherPlanHasContent,
} from '../../lib/academic/weeklyPlanHelpers';
import { mergeTeacherClassRefs } from '../../lib/academic/teacherSetupHelpers';
import {
  buildScheduleSlotsByClass,
  classScheduleKey,
  scheduleInputsFromTeacherSchedules,
} from '../../lib/academic/classScheduleSlots';
import type { AcademicEducationLevel, AcademicSemester, AcademicWeeklyPlan } from '../../lib/academic/types';
import {
  AcademicLayout,
  AcademicPageHeader,
  AcademicEmpty,
  academicInputClass,
  academicBtnPrimary,
  academicBtnSecondary,
} from '../../components/academic/AcademicUi';
import { WeeklyPlanHistoryCard } from '../../components/academic/WeeklyPlanHistoryCard';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { isAcademicTeacher } from '../../lib/academic/roleHelpers';
import clsx from 'clsx';

const ALL = '';

type PlanFilters = {
  level: AcademicEducationLevel | typeof ALL;
  grade: number | typeof ALL;
  section: string | typeof ALL;
  semester: AcademicSemester | typeof ALL;
  week: number | typeof ALL;
  search: string;
};

function planMatchesSearch(plan: AcademicWeeklyPlan, teacherId: string, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    ACADEMIC_LEVEL_LABELS[plan.education_level],
    formatGradeLabel(plan.education_level, plan.grade),
    formatGradeSection(plan.education_level, plan.grade, plan.section),
    formatSemesterWeek(plan.semester ?? 1, plan.week_number),
    `فصل ${plan.section}`,
    String(plan.grade),
    String(plan.week_number),
    ...filterEntriesForTeacher(plan.entries, teacherId, plan.teacher_id).flatMap((e) => [
      e.subject,
      e.lesson_topic,
      e.day,
      String(e.period),
    ]),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(needle);
}

function teacherOwnsPlan(plan: AcademicWeeklyPlan, teacherId: string): boolean {
  return teacherPlanHasContent(plan, teacherId);
}

function planHasOtherTeachers(plan: AcademicWeeklyPlan, teacherId: string): boolean {
  return normalizePlanEntries(plan.entries).some((e) => {
    if (!e.lesson_topic?.trim()) return false;
    const owner = e.teacher_id ?? plan.teacher_id;
    return !sameTeacherId(owner, teacherId);
  });
}

function buildDeleteConfirmMessage(plan: AcademicWeeklyPlan, teacherId: string): string {
  const label = formatGradeSection(plan.education_level, plan.grade, plan.section);
  const week = formatSemesterWeek(plan.semester ?? 1, plan.week_number);
  if (planHasOtherTeachers(plan, teacherId)) {
    return `حذف حصصك من خطة ${label} (${week})؟ ستبقى حصص المعلمين الآخرين في الخطة المشتركة.`;
  }
  return `حذف خطة ${label} (${week}) نهائياً؟ لا يمكن التراجع.`;
}

export function AcademicMyWeeklyPlansPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, role } = useAuthStore();
  const isTeacher = isAcademicTeacher(role);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  const [filters, setFilters] = useState<PlanFilters>({
    level: ALL,
    grade: ALL,
    section: ALL,
    semester: ALL,
    week: ALL,
    search: '',
  });

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

  const { data: plans = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['academic-plans', user?.id, 'mine'],
    queryFn: () => academicWeeklyPlanService.listByTeacher(user!.id),
    enabled: !!user && isTeacher,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const scheduleSlotsByClass = useMemo(() => {
    const inputs = scheduleInputsFromTeacherSchedules(schedules, user?.full_name ?? 'أنت');
    return buildScheduleSlotsByClass(inputs);
  }, [schedules, user?.full_name]);

  const myPlans = useMemo(
    () => plans.filter((p) => user && teacherOwnsPlan(p, user.id)),
    [plans, user],
  );

  const filterOptions = useMemo(() => {
    const levels = [...new Set(myPlans.map((p) => p.education_level))];
    const grades = [
      ...new Set(
        myPlans
          .filter((p) => filters.level === ALL || p.education_level === filters.level)
          .map((p) => p.grade),
      ),
    ].sort((a, b) => a - b);
    const sections = [
      ...new Set(
        myPlans
          .filter(
            (p) =>
              (filters.level === ALL || p.education_level === filters.level)
              && (filters.grade === ALL || p.grade === filters.grade),
          )
          .map((p) => p.section),
      ),
    ].sort((a, b) => a.localeCompare(b, 'ar'));
    const semesters = [...new Set(myPlans.map((p) => (p.semester ?? 1) as AcademicSemester))].sort();
    const weeks = [
      ...new Set(
        myPlans
          .filter((p) => filters.semester === ALL || (p.semester ?? 1) === filters.semester)
          .map((p) => p.week_number),
      ),
    ].sort((a, b) => a - b);

    return { levels, grades, sections, semesters, weeks };
  }, [myPlans, filters.level, filters.grade, filters.semester]);

  const filteredPlans = useMemo(() => {
    return myPlans
      .filter((p) => {
        if (filters.level !== ALL && p.education_level !== filters.level) return false;
        if (filters.grade !== ALL && Number(p.grade) !== Number(filters.grade)) return false;
        if (filters.section !== ALL && p.section !== filters.section) return false;
        if (filters.semester !== ALL && Number(p.semester ?? 1) !== Number(filters.semester)) return false;
        if (filters.week !== ALL && Number(p.week_number) !== Number(filters.week)) return false;
        if (!user) return false;
        return planMatchesSearch(p, user.id, filters.search);
      })
      .sort(
        (a, b) =>
          (b.semester ?? 1) - (a.semester ?? 1)
          || b.week_number - a.week_number
          || a.grade - b.grade
          || a.section.localeCompare(b.section, 'ar'),
      );
  }, [myPlans, filters, user]);

  const hasActiveFilters =
    filters.level !== ALL
    || filters.grade !== ALL
    || filters.section !== ALL
    || filters.semester !== ALL
    || filters.week !== ALL
    || filters.search.trim().length > 0;

  const resetFilters = () => {
    setFilters({ level: ALL, grade: ALL, section: ALL, semester: ALL, week: ALL, search: '' });
  };

  const openEdit = (plan: AcademicWeeklyPlan) => {
    navigate('/academic/weekly-plans', { state: { editPlanId: plan.id } });
  };

  const deleteMut = useMutation({
    mutationFn: (plan: AcademicWeeklyPlan) =>
      academicWeeklyPlanService.removeForTeacher(plan, user!.id, user!.full_name ?? 'معلم'),
    onMutate: (plan) => setDeletingPlanId(plan.id),
    onSettled: () => setDeletingPlanId(null),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['academic-plans'] });
      qc.invalidateQueries({ queryKey: ['academic-class-plan'] });
    },
    onError: (err) => {
      alert(err instanceof Error ? err.message : 'تعذّر حذف الخطة');
    },
  });

  const handleDelete = (plan: AcademicWeeklyPlan) => {
    if (!user) return;
    if (!confirm(buildDeleteConfirmMessage(plan, user.id))) return;
    deleteMut.mutate(plan);
  };

  if (!isTeacher) {
    return (
      <AcademicLayout size="4xl">
        <AcademicPageHeader title="خططي" backTo="/academic/weekly-plans" />
        <AcademicEmpty message="هذه الشاشة للمعلمين فقط" />
      </AcademicLayout>
    );
  }

  return (
    <AcademicLayout size="6xl">
      <AcademicPageHeader
        title="خططي"
        subtitle="خططك المحفوظة — فلترة حسب المرحلة والصف والفصل والأسبوع"
        backTo="/academic/weekly-plans"
        action={
          <Link to="/academic/weekly-plans" className={academicBtnPrimary}>
            <Plus className="w-4 h-4" /> خطة جديدة
          </Link>
        }
      />

      <div className="horizon-card rounded-2xl bg-[#111c44] border border-white/[0.06] p-4 sm:p-5 mb-5 space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3AED0] pointer-events-none" />
          <input
            className={clsx(academicInputClass, 'pr-10')}
            placeholder="بحث في المواضيع، المادة، الصف، الفصل، الأسبوع..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <label className="block col-span-2 sm:col-span-1">
            <span className="text-[#A3AED0] text-xs mb-1.5 block">المرحلة</span>
            <select
              className={academicInputClass}
              value={filters.level}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  level: e.target.value as PlanFilters['level'],
                  grade: ALL,
                  section: ALL,
                  week: ALL,
                }))
              }
            >
              <option value={ALL}>كل المراحل</option>
              {filterOptions.levels.map((lv) => (
                <option key={lv} value={lv}>{ACADEMIC_LEVEL_LABELS[lv]}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[#A3AED0] text-xs mb-1.5 block">الصف</span>
            <select
              className={academicInputClass}
              value={filters.grade === ALL ? ALL : String(filters.grade)}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  grade: e.target.value === ALL ? ALL : Number(e.target.value),
                  section: ALL,
                  week: ALL,
                }))
              }
            >
              <option value={ALL}>كل الصفوف</option>
              {filterOptions.grades.map((g) => (
                <option key={g} value={g}>
                  {filters.level !== ALL
                    ? formatGradeLabel(filters.level, g)
                    : `صف ${g}`}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[#A3AED0] text-xs mb-1.5 block">الفصل</span>
            <select
              className={academicInputClass}
              value={filters.section}
              onChange={(e) =>
                setFilters((f) => ({ ...f, section: e.target.value, week: ALL }))
              }
            >
              <option value={ALL}>كل الفصول</option>
              {filterOptions.sections.map((s) => (
                <option key={s} value={s}>فصل {s}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[#A3AED0] text-xs mb-1.5 block">الفصل الدراسي</span>
            <select
              className={academicInputClass}
              value={filters.semester === ALL ? ALL : String(filters.semester)}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  semester: e.target.value === ALL ? ALL : (Number(e.target.value) as AcademicSemester),
                  week: ALL,
                }))
              }
            >
              <option value={ALL}>الكل</option>
              {filterOptions.semesters.map((s) => (
                <option key={s} value={s}>{SEMESTER_LABELS[s]}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[#A3AED0] text-xs mb-1.5 block">الأسبوع</span>
            <select
              className={academicInputClass}
              value={filters.week === ALL ? ALL : String(filters.week)}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  week: e.target.value === ALL ? ALL : Number(e.target.value),
                }))
              }
            >
              <option value={ALL}>كل الأسابيع</option>
              {filterOptions.weeks.map((w) => (
                <option key={w} value={w}>الأسبوع {w}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
          <p className="text-[#A3AED0] text-sm">
            {filteredPlans.length} خطة
            {hasActiveFilters ? ' (بعد الفلترة)' : ''}
            {teacherClasses.length === 0 && myPlans.length === 0 ? ' — أكمل إعداد الملف التعليمي' : ''}
          </p>
          {hasActiveFilters && (
            <button type="button" className={academicBtnSecondary} onClick={resetFilters}>
              <FilterX className="w-4 h-4" /> مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {isLoading || isFetching ? (
        <TapHandLoader label="جاري تحميل خططك..." />
      ) : filteredPlans.length === 0 ? (
        <AcademicEmpty
          message={
            myPlans.length === 0
              ? 'لم تنشئ أي خطة بعد — ابدأ من «خطة جديدة»'
              : 'لا توجد خطط تطابق الفلتر — جرّب توسيع البحث أو مسح الفلاتر'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredPlans.map((plan) => (
            <WeeklyPlanHistoryCard
              key={plan.id}
              plan={plan}
              isTeacher
              teacherId={user?.id}
              scheduleSlots={scheduleSlotsByClass.get(
                classScheduleKey(plan.education_level, plan.grade, plan.section),
              )}
              onEdit={() => openEdit(plan)}
              onDelete={deletingPlanId === plan.id ? undefined : () => handleDelete(plan)}
            />
          ))}
        </div>
      )}

      {!isLoading && filteredPlans.length > 0 && (
        <p className="text-[#A3AED0] text-xs mt-4 text-center">
          إجمالي حصصك في النتائج:{' '}
          {filteredPlans.reduce(
            (n, p) => n + (user ? teacherFilledSlotCount(p, user.id) : 0),
            0,
          )}{' '}
          حصة
        </p>
      )}
    </AcademicLayout>
  );
}
