import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { academicTeacherService } from '../../lib/academic/teacherService';
import { academicAdminService } from '../../lib/academic/adminService';
import { teacherSubjectNamesForGrade, subjectsFromTeacherSetup } from '../../lib/academic/subjectHelpers';
import {
  DAYS_AR,
  DEFAULT_SECTIONS,
  gradesForLevel,
  formatGradeLabel,
  formatGradeSection,
  PERIODS_PER_DAY,
} from '../../lib/academic/constants';
import type {
  AcademicEducationLevel,
  AcademicSchedulePeriod,
  AcademicTeacherSchedule,
} from '../../lib/academic/types';
import {
  AcademicLayout,
  AcademicPageHeader,
  AcademicEmpty,
  AcademicFormPanel,
  academicInputClass,
  academicBtnPrimary,
  academicBtnSecondary,
} from '../../components/academic/AcademicUi';
import { AcademicSubjectSelect } from '../../components/academic/AcademicSubjectSelect';
import { fetchTeacherClassAssignmentsByUserId } from '../../lib/teacherScope';
import { scheduleSlotCount } from '../../lib/academic/teacherSetupHelpers';
import {
  classesMatch,
  normalizeClassName,
  olympiadGradeToAcademic,
} from '../../lib/academic/gradeBridge';

const PERIODS = [...PERIODS_PER_DAY];

function emptyPeriods(): AcademicSchedulePeriod[] {
  return DAYS_AR.flatMap((day) =>
    PERIODS.map((period) => ({ day, period, subject: '', is_empty: true })),
  );
}

function periodIndex(day: string, period: number): number {
  const di = DAYS_AR.indexOf(day as (typeof DAYS_AR)[number]);
  return di * PERIODS.length + period - 1;
}

export function AcademicSchedulePage() {
  const { user } = useAuthStore();
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [level, setLevel] = useState<AcademicEducationLevel>('middle');
  const [grade, setGrade] = useState(1);
  const [section, setSection] = useState('أ');
  const [periods, setPeriods] = useState(emptyPeriods());
  const [openDay, setOpenDay] = useState<string>(DAYS_AR[0]);

  const { data: schedules = [] } = useQuery({
    queryKey: ['academic-schedules', user?.id],
    queryFn: () => academicTeacherService.listSchedules(user!.id),
    enabled: !!user,
  });

  const { data: setup } = useQuery({
    queryKey: ['academic-teacher-setup', user?.id],
    queryFn: () => academicTeacherService.getSetup(user!.id),
    enabled: !!user,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['teacher', 'classes', user?.id],
    queryFn: () => fetchTeacherClassAssignmentsByUserId(user!.id),
    enabled: !!user,
  });

  const assignedCombos = useMemo(() => {
    const out: { level: AcademicEducationLevel; grade: number; section: string }[] = [];
    const seen = new Set<string>();
    for (const a of assignments) {
      const parsed = olympiadGradeToAcademic(a.grade);
      if (!parsed) continue;
      const sec = a.class_name.replace(/^فصل\s+/u, '').trim() || a.class_name;
      const key = `${parsed.level}-${parsed.grade}-${normalizeClassName(sec)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ level: parsed.level, grade: parsed.grade, section: sec });
    }
    return out;
  }, [assignments]);

  const availableLevels = useMemo(() => {
    if (!assignedCombos.length) return ['middle', 'high'] as AcademicEducationLevel[];
    return [...new Set(assignedCombos.map((c) => c.level))];
  }, [assignedCombos]);

  const availableGrades = useMemo(() => {
    if (!assignedCombos.length) return gradesForLevel(level);
    return [...new Set(assignedCombos.filter((c) => c.level === level).map((c) => c.grade))].sort(
      (a, b) => a - b,
    );
  }, [assignedCombos, level]);

  const availableSections = useMemo(() => {
    if (!assignedCombos.length) return [...DEFAULT_SECTIONS];
    return [
      ...new Set(
        assignedCombos
          .filter((c) => c.level === level && c.grade === grade)
          .map((c) => c.section),
      ),
    ];
  }, [assignedCombos, level, grade]);

  const { data: allSubjects = [] } = useQuery({
    queryKey: ['academic-subjects'],
    queryFn: academicAdminService.listSubjects,
  });

  const subjectOptions = useMemo(
    () => teacherSubjectNamesForGrade(allSubjects, level, grade, subjectsFromTeacherSetup(setup, level, grade)),
    [allSubjects, level, grade, setup],
  );

  useEffect(() => {
    if (!assignedCombos.length) return;
    if (!availableLevels.includes(level)) setLevel(availableLevels[0]);
  }, [assignedCombos, availableLevels, level]);

  useEffect(() => {
    if (!availableGrades.includes(grade) && availableGrades[0] != null) {
      setGrade(availableGrades[0]);
    }
  }, [availableGrades, grade]);

  useEffect(() => {
    if (!availableSections.length) return;
    if (!availableSections.some((s) => classesMatch(s, section))) {
      setSection(availableSections[0]);
    }
  }, [availableSections, section]);

  const existingForSelectedClass = useMemo(
    () =>
      schedules.find(
        (s) =>
          s.education_level === level &&
          s.grade === grade &&
          classesMatch(s.section, section),
      ) ?? null,
    [schedules, level, grade, section],
  );

  useEffect(() => {
    if (!showForm) return;
    if (existingForSelectedClass) {
      if (editingId === existingForSelectedClass.id) return;
      setEditingId(existingForSelectedClass.id);
      setPeriods(
        existingForSelectedClass.periods.length
          ? existingForSelectedClass.periods
          : emptyPeriods(),
      );
      return;
    }
    if (editingId) {
      setEditingId(null);
      setPeriods(emptyPeriods());
    }
  }, [showForm, existingForSelectedClass, editingId]);

  useEffect(() => {
    if (!showForm || subjectOptions.length === 0) return;
    setPeriods((prev) =>
      prev.map((p) => {
        if (!p.subject.trim() || subjectOptions.includes(p.subject)) return p;
        return { ...p, subject: '', is_empty: true };
      }),
    );
  }, [level, grade, subjectOptions, showForm]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setPeriods(emptyPeriods());
    setOpenDay(DAYS_AR[0]);
  };

  const startEdit = (s: AcademicTeacherSchedule) => {
    setEditingId(s.id);
    setLevel(s.education_level);
    setGrade(s.grade);
    setSection(s.section);
    setPeriods(s.periods.length ? s.periods : emptyPeriods());
    setShowForm(true);
    setOpenDay(DAYS_AR[0]);
  };

  const saveMut = useMutation({
    mutationFn: () =>
      academicTeacherService.saveSchedule({
        id: editingId ?? undefined,
        teacher_id: user!.id,
        education_level: level,
        grade,
        section,
        periods,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-schedules'] });
      resetForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: academicTeacherService.deleteSchedule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-schedules'] }),
  });

  const updatePeriod = (index: number, subject: string) => {
    setPeriods((prev) =>
      prev.map((p, i) => (i === index ? { ...p, subject, is_empty: !subject.trim() } : p)),
    );
  };

  const dayFilledCount = (day: string) =>
    PERIODS.filter((period) => {
      const p = periods[periodIndex(day, period)];
      return p && !p.is_empty && p.subject.trim();
    }).length;

  const classLoads = useMemo(
    () =>
      schedules.map((s) => ({
        id: s.id,
        label: formatGradeSection(s.education_level, s.grade, s.section),
        count: scheduleSlotCount(s),
      })),
    [schedules],
  );
  const totalLoad = useMemo(() => classLoads.reduce((n, c) => n + c.count, 0), [classLoads]);

  return (
    <AcademicLayout size="6xl">
      <AcademicPageHeader
        title="الجدول الدراسي"
        subtitle="حصصك حسب الفصول — مع نصاب كل صف والنصاب الجماعي"
        backTo="/academic"
        action={
          <button
            type="button"
            className={`${academicBtnPrimary} min-h-[44px]`}
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4" /> جدول
          </button>
        }
      />
      {params.get('setup') === '1' && (
        <p className="text-green-400 text-sm mb-4">تم الإعداد — أضف جدولك الدراسي</p>
      )}

      {schedules.length > 0 && (
        <div className="mb-4 rounded-2xl border border-gold-400/25 bg-gold-500/10 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] text-[#A3AED0] mb-0.5">النصاب الجماعي</p>
              <p className="text-white font-black text-2xl tabular-nums leading-none">
                {totalLoad}
                <span className="text-sm font-semibold text-gold-300 mr-1">حصة</span>
              </p>
            </div>
            <p className="text-xs text-[#A3AED0]">{classLoads.length} فصل</p>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {classLoads.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl bg-navy-950/40 border border-white/[0.06] px-3 py-2"
              >
                <span className="text-white text-sm font-semibold truncate">{c.label}</span>
                <span className="text-gold-300 text-sm font-bold tabular-nums shrink-0 mr-2">
                  {c.count} حصة
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showForm && (
        <AcademicFormPanel
          title={existingForSelectedClass ? 'تعديل الجدول' : 'جدول جديد'}
          className="mb-4"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              className={`${academicInputClass} min-h-[48px]`}
              value={level}
              onChange={(e) => setLevel(e.target.value as AcademicEducationLevel)}
            >
              {availableLevels.map((lv) => (
                <option key={lv} value={lv}>
                  {lv === 'middle' ? 'متوسط' : 'ثانوي'}
                </option>
              ))}
            </select>
            <select
              className={`${academicInputClass} min-h-[48px]`}
              value={grade}
              onChange={(e) => setGrade(+e.target.value)}
            >
              {availableGrades.map((g) => (
                <option key={g} value={g}>
                  {formatGradeLabel(level, g)}
                </option>
              ))}
            </select>
            <select
              className={`${academicInputClass} min-h-[48px]`}
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              {availableSections.map((s) => (
                <option key={s} value={s}>
                  فصل {s}
                </option>
              ))}
            </select>
          </div>

          {existingForSelectedClass && (
            <p className="text-amber-200 text-sm rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
              يوجد جدول لهذا الفصل مسبقاً — التعديل يحدّث نفس الجدول ولا يُنشئ جدولاً ثانياً.
            </p>
          )}

          {assignedCombos.length === 0 && (
            <p className="text-amber-300 text-sm rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
              لم تُسند فصول لحسابك — ستظهر كل الصفوف مؤقتاً. اطلب من الإدارة ربط فصولك.
            </p>
          )}

          {subjectOptions.length === 0 ? (
            <p className="text-amber-300 text-sm rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
              لا مواد مسجّلة لهذا الصف — أكمل إعداد الملف التعليمي.
            </p>
          ) : (
            <p className="text-[#A3AED0] text-xs leading-relaxed">
              موادك: {subjectOptions.join('، ')}
            </p>
          )}

          {/* جوال: يوم بيوم */}
          <div className="sm:hidden space-y-2">
            {DAYS_AR.map((day) => {
              const open = openDay === day;
              const filled = dayFilledCount(day);
              return (
                <div
                  key={day}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenDay(open ? '' : day)}
                    className="w-full flex items-center justify-between px-4 py-3 min-h-[52px] text-right"
                  >
                    <span className="text-white font-semibold text-sm">{day}</span>
                    <span className="flex items-center gap-2 text-xs text-[#A3AED0]">
                      {filled}/{PERIODS.length} حصص
                      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {open && (
                    <div className="px-3 pb-3 space-y-2 border-t border-white/[0.06] pt-2">
                      {PERIODS.map((period) => {
                        const idx = periodIndex(day, period);
                        return (
                          <label key={period} className="block">
                            <span className="text-[11px] text-[#A3AED0] mb-1 block">حصة {period}</span>
                            <AcademicSubjectSelect
                              level={level}
                              grade={grade}
                              value={periods[idx]?.subject ?? ''}
                              onChange={(v) => updatePeriod(idx, v)}
                              teacherSetupSubjects={subjectsFromTeacherSetup(setup, level, grade)}
                              allowCustom={false}
                              placeholder="—"
                              className={`${academicInputClass} text-sm py-3 min-h-[48px]`}
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* سطح المكتب: جدول */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-white/[0.06]">
            <table className="w-full min-w-[640px] text-sm text-white border-collapse">
              <thead>
                <tr className="bg-white/[0.04] text-[#A3AED0]">
                  <th className="p-2 text-right font-semibold">اليوم</th>
                  {PERIODS.map((p) => (
                    <th key={p} className="p-2 text-center font-semibold">
                      حصة {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS_AR.map((day, di) => (
                  <tr key={day} className="border-t border-white/[0.04]">
                    <td className="p-2 font-medium text-white bg-white/[0.02]">{day}</td>
                    {PERIODS.map((period) => {
                      const idx = di * PERIODS.length + period - 1;
                      return (
                        <td key={period} className="p-1.5">
                          <AcademicSubjectSelect
                            level={level}
                            grade={grade}
                            value={periods[idx]?.subject ?? ''}
                            onChange={(v) => updatePeriod(idx, v)}
                            teacherSetupSubjects={subjectsFromTeacherSetup(setup, level, grade)}
                            allowCustom={false}
                            placeholder="—"
                            className={`${academicInputClass} text-xs py-2 min-w-[108px]`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <button
              type="button"
              className={`${academicBtnPrimary} min-h-[48px] justify-center`}
              onClick={() => saveMut.mutate()}
              disabled={subjectOptions.length === 0}
            >
              {existingForSelectedClass ? 'تحديث' : 'حفظ'}
            </button>
            <button
              type="button"
              className={`${academicBtnSecondary} min-h-[48px] justify-center`}
              onClick={resetForm}
            >
              إلغاء
            </button>
          </div>
        </AcademicFormPanel>
      )}

      {schedules.length === 0 ? (
        <AcademicEmpty message="لا جداول بعد — اضغط «جدول» للبدء" />
      ) : (
        schedules.map((s) => (
          <div key={s.id} className="horizon-card rounded-[20px] bg-[#111c44] p-4 mb-3">
            <div className="flex justify-between items-start gap-2 mb-3">
              <h3 className="text-white font-semibold text-sm sm:text-base">
                {formatGradeSection(s.education_level, s.grade, s.section)}
                <span className="mr-2 text-gold-300 font-bold text-xs">
                  · نصاب {scheduleSlotCount(s)} حصة
                </span>
              </h3>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  className="text-gold-400 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl hover:bg-white/5"
                  onClick={() => startEdit(s)}
                  aria-label="تعديل"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="text-red-400 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl hover:bg-white/5"
                  onClick={() => {
                    if (confirm('حذف؟')) deleteMut.mutate(s.id);
                  }}
                  aria-label="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* جوال: ملخص أيامي */}
            <ul className="sm:hidden space-y-1.5">
              {DAYS_AR.map((day) => {
                const dayPeriods = PERIODS.map((period) =>
                  s.periods.find((x) => x.day === day && x.period === period),
                ).filter((p) => p && !p.is_empty && p.subject.trim());
                if (!dayPeriods.length) return null;
                return (
                  <li
                    key={day}
                    className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-[#A3AED0]"
                  >
                    <span className="text-white font-medium">{day}: </span>
                    {dayPeriods.map((p) => p!.subject).join(' · ')}
                  </li>
                );
              })}
            </ul>
            <div className="hidden sm:block overflow-x-auto text-xs text-[#A3AED0]">
              <table className="w-full">
                <tbody>
                  {DAYS_AR.map((day) => (
                    <tr key={day}>
                      <td className="p-1 text-white">{day}</td>
                      {PERIODS.map((period) => {
                        const p = s.periods.find((x) => x.day === day && x.period === period);
                        return (
                          <td key={period} className="p-1">
                            {p?.is_empty ? '—' : p?.subject}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </AcademicLayout>
  );
}
