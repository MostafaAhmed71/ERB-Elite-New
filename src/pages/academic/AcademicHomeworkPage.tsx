import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, BookOpen, FileDown, CalendarOff, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { academicHomeworkService } from '../../lib/academic/homeworkService';
import { academicTeacherService } from '../../lib/academic/teacherService';
import {
  ACADEMIC_LEVEL_LABELS,
  formatGradeLabel,
  formatGradeSection,
} from '../../lib/academic/constants';
import {
  mergeTeacherClassRefs,
  teacherGradesForLevel,
  teacherLevelsFromClasses,
  teacherSectionsForGrade,
  type TeacherClassRef,
} from '../../lib/academic/teacherSetupHelpers';
import {
  getSchoolDayFromDate,
  mergeClassRefsWithInitial,
  sectionsForClassSubjectOnDay,
  subjectsForClassOnDay,
  teacherClassesForScheduleDay,
  teacherHasClassesOnDate,
} from '../../lib/academic/scheduleDayHelpers';
import { getRiyadhDateString } from '../../lib/competition/time';
import type { AcademicEducationLevel, AcademicHomework } from '../../lib/academic/types';
import {
  formatHomeworkPageNumbers,
  normalizeHomeworkPageNumbers,
  parsePageNumberInput,
} from '../../lib/academic/homeworkHelpers';
import {
  AcademicLayout, AcademicPageHeader, AcademicEmpty, AcademicTable,
  AcademicFormPanel, AcademicField, AcademicChip, AcademicIconButton, AcademicBadge,
  academicInputClass, academicBtnPrimary, academicBtnSecondary, academicGrid2,
} from '../../components/academic/AcademicUi';
import { AcademicSubjectSelect } from '../../components/academic/AcademicSubjectSelect';
import { subjectsFromTeacherSetup } from '../../lib/academic/subjectHelpers';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { canExportAcademicTemplates, isAcademicSupervisorView, isAcademicTeacher } from '../../lib/academic/roleHelpers';

export function AcademicHomeworkPage() {
  const { user, role } = useAuthStore();
  const qc = useQueryClient();
  const isTeacher = isAcademicTeacher(role);
  const isSupervisor = isAcademicSupervisorView(role);
  const [editing, setEditing] = useState<AcademicHomework | null>(null);
  const [showForm, setShowForm] = useState(false);
  const deputyLevel = user?.staff_education_level as AcademicEducationLevel | undefined;

  const [levelFilter, setLevelFilter] = useState<string>(() => {
    if (role === 'deputy' && deputyLevel) return deputyLevel;
    if (role === 'supervisor' && user?.staff_education_level && (user.staff_education_level === 'middle' || user.staff_education_level === 'high')) {
      return user.staff_education_level;
    }
    return 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');

  const { data: homeworks = [], isLoading } = useQuery({
    queryKey: ['academic-homeworks', user?.id, role, deputyLevel],
    queryFn: () => {
      if (role === 'teacher' && user) return academicHomeworkService.listByTeacher(user.id);
      if (role === 'deputy' && deputyLevel) return academicHomeworkService.listByLevel(deputyLevel);
      return academicHomeworkService.listAll();
    },
    enabled: !!user && !!role,
  });

  const filteredHomeworks = useMemo(() => {
    return homeworks.filter((hw) => {
      if (levelFilter !== 'all' && hw.education_level !== levelFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTeacher = hw.teacher_name?.toLowerCase().includes(q);
        const matchSubject = hw.subject?.toLowerCase().includes(q);
        const matchTopic = hw.lesson_topic?.toLowerCase().includes(q);
        const matchGrade = formatGradeLabel(hw.education_level, hw.grade).toLowerCase().includes(q);
        if (!matchTeacher && !matchSubject && !matchTopic && !matchGrade) return false;
      }
      return true;
    });
  }, [homeworks, levelFilter, searchQuery]);

  const deleteMut = useMutation({
    mutationFn: academicHomeworkService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-homeworks'] }),
  });

  const { data: teacherSchedules = [] } = useQuery({
    queryKey: ['academic-schedules', user?.id],
    queryFn: () => academicTeacherService.listSchedules(user!.id),
    enabled: !!user && isTeacher,
  });

  const todaySchoolDay = getSchoolDayFromDate(getRiyadhDateString());
  const todayHasClasses = !!(
    todaySchoolDay
    && teacherClassesForScheduleDay(teacherSchedules, todaySchoolDay).length > 0
  );

  return (
    <AcademicLayout>
      <AcademicPageHeader
        title="الواجبات المنزلية"
        subtitle={
          isTeacher
            ? 'أدخل الواجب حسب حصصك اليوم في الجدول الدراسي — يظهر لك فصول المواد التي تدرّسها'
            : isSupervisor
              ? 'عرض واجبات جميع المعلمين — بدون تعديل'
              : 'عرض وتصدير واجبات المعلمين حسب الفصل'
        }
        backTo={isSupervisor ? '/dashboard' : '/academic'}
        action={
          isTeacher ? (
            <button
              type="button"
              className={academicBtnPrimary}
              onClick={() => { setEditing(null); setShowForm(true); }}
              disabled={teacherSchedules.length > 0 && !todayHasClasses && !showForm && !editing}
            >
              <Plus className="w-4 h-4" /> واجب جديد
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

      {isTeacher && teacherSchedules.length > 0 && !todayHasClasses && !showForm && !editing && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 mb-5 flex items-start gap-3">
          <CalendarOff className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-semibold">ليس لديك حصص اليوم</p>
            <p className="text-[#A3AED0] text-sm mt-1">
              {todaySchoolDay
                ? `لا توجد حصص مسجّلة لك في الجدول يوم ${todaySchoolDay}. يمكنك مراجعة واجباتك السابقة أو تعديل الجدول.`
                : 'اليوم عطلة — لا حصص دراسية. يمكنك مراجعة واجباتك السابقة.'}
            </p>
            <Link to="/academic/schedule" className="inline-flex mt-3 text-sm font-semibold text-gold-400 hover:text-gold-300">
              الجدول الدراسي
            </Link>
          </div>
        </div>
      )}

      {isTeacher && teacherSchedules.length === 0 && !showForm && !editing && (
        <div className="rounded-2xl border border-[#7551FF]/25 bg-[#7551FF]/10 p-5 mb-5">
          <p className="text-white font-semibold mb-1">أكمل الجدول الدراسي أولاً</p>
          <p className="text-[#A3AED0] text-sm mb-3">
            لربط الواجبات بحصصك اليومية، سجّل جدولك الدراسي ثم عد لإدخال الواجب.
          </p>
          <Link to="/academic/schedule" className={academicBtnPrimary}>
            إعداد الجدول الدراسي
          </Link>
        </div>
      )}

      {(showForm || editing) && user && (
        <HomeworkForm
          teacherId={user.id}
          teacherName={user.full_name}
          initial={editing ?? undefined}
          onDone={() => { setShowForm(false); setEditing(null); qc.invalidateQueries({ queryKey: ['academic-homeworks'] }); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {isLoading ? (
        <TapHandLoader label="جاري التحميل..." />
      ) : homeworks.length === 0 ? (
        <AcademicEmpty message="لا توجد واجبات بعد" icon={BookOpen} />
      ) : (
        <>
          {/* شريط الفلترة والبحث لغير المعلم (المشرف / الوكيل / المدير) */}
          {!isTeacher && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-2 flex-wrap">
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

              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-white/40 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالمعلم، المادة، أو الصف..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-gold-400/50"
                  />
                </div>
              </div>

              <span className="text-xs text-white/40">
                عرض {filteredHomeworks.length} من أصل {homeworks.length} واجب
              </span>
            </div>
          )}

          {filteredHomeworks.length === 0 ? (
            <AcademicEmpty message="لا توجد نتائج تطابق الفلتر المحدّد" icon={BookOpen} />
          ) : (
            <>
              {/* عرض بطاقات على الهاتف */}
              <div className="grid gap-3 md:hidden">
                {filteredHomeworks.map((hw) => {
                  const pages = formatHomeworkPageNumbers(normalizeHomeworkPageNumbers(hw));
                  return (
                    <div key={hw.id} className="rounded-2xl bg-[#111c44] border border-white/[0.06] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-gold-400 truncate">{hw.subject}</h3>
                          <p className="text-white text-sm font-medium mt-0.5 leading-snug">{hw.lesson_topic}</p>
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/[0.06] text-[#A3AED0] whitespace-nowrap">
                          {new Date(hw.date).toLocaleDateString('ar-SA')}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#422AFB]/15 text-[#c4b5fd] border border-[#7551FF]/20">
                          {formatGradeLabel(hw.education_level, hw.grade)}
                        </span>
                        {hw.sections?.length > 0 && (
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.06] text-[#A3AED0]">
                            {hw.sections.map((s) => `فصل ${s}`).join(' · ')}
                          </span>
                        )}
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#01B574]/15 text-[#01B574] border border-[#01B574]/20">
                          {pages}
                        </span>
                      </div>

                      {!isTeacher && (
                        <p className="mt-3 text-xs text-[#A3AED0]">المعلم: <span className="text-white">{hw.teacher_name}</span></p>
                      )}

                      {isTeacher && (
                        <div className="mt-3 flex gap-2 border-t border-white/[0.06] pt-3">
                          <button
                            type="button"
                            onClick={() => { setEditing(hw); setShowForm(false); }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gold-400/10 text-gold-400 font-semibold py-2 text-sm hover:bg-gold-400/15 transition-colors"
                          >
                            <Pencil className="w-4 h-4" /> تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => { if (confirm('حذف؟')) deleteMut.mutate(hw.id); }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-400/10 text-red-400 font-semibold py-2 text-sm hover:bg-red-400/15 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> حذف
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* عرض جدول على الشاشات الأكبر */}
              <div className="hidden md:block">
                <AcademicTable>
                  <thead>
                    <tr className="text-[#A3AED0] border-b border-white/10 bg-white/[0.02]">
                      <th className="p-3 font-semibold">التاريخ</th>
                      <th className="p-3 font-semibold">المعلم</th>
                      <th className="p-3 font-semibold">المرحلة</th>
                      <th className="p-3 font-semibold">الصف</th>
                      <th className="p-3 font-semibold">المادة</th>
                      <th className="p-3 font-semibold">الموضوع</th>
                      <th className="p-3 font-semibold">الصفحات</th>
                      {isTeacher && <th className="p-3 font-semibold">إجراءات</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHomeworks.map((hw) => (
                      <tr key={hw.id} className="border-b border-white/5 text-white hover:bg-white/[0.02] transition-colors">
                        <td className="p-3">{new Date(hw.date).toLocaleDateString('ar-SA')}</td>
                        <td className="p-3">{hw.teacher_name}</td>
                        <td className="p-3">{ACADEMIC_LEVEL_LABELS[hw.education_level]}</td>
                        <td className="p-3">{formatGradeLabel(hw.education_level, hw.grade)}</td>
                        <td className="p-3 font-medium text-gold-400/90">{hw.subject}</td>
                        <td className="p-3">{hw.lesson_topic}</td>
                        <td className="p-3 text-[#A3AED0] text-sm">
                          {formatHomeworkPageNumbers(normalizeHomeworkPageNumbers(hw))}
                        </td>
                        {isTeacher && (
                          <td className="p-3">
                            <div className="flex gap-1">
                              <AcademicIconButton icon={Pencil} variant="edit" label="تعديل" onClick={() => { setEditing(hw); setShowForm(false); }} />
                              <AcademicIconButton icon={Trash2} variant="delete" label="حذف" onClick={() => { if (confirm('حذف؟')) deleteMut.mutate(hw.id); }} />
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </AcademicTable>
              </div>
            </>
          )}
        </>
      )}
    </AcademicLayout>
  );
}

function pickInitialClass(classes: TeacherClassRef[], initial?: AcademicHomework): {
  level: AcademicEducationLevel;
  grade: number;
  sections: string[];
} {
  if (initial) {
    const allowed = teacherSectionsForGrade(classes, initial.education_level, initial.grade);
    const sections = initial.sections.filter((s) => allowed.includes(s));
    return {
      level: initial.education_level,
      grade: initial.grade,
      sections: sections.length ? sections : allowed.slice(0, 1),
    };
  }
  const first = classes[0];
  if (!first) return { level: 'middle', grade: 1, sections: [] };
  return {
    level: first.level,
    grade: first.grade,
    sections: [first.section],
  };
}

function HomeworkForm({
  teacherId, teacherName, initial, onDone, onCancel,
}: {
  teacherId: string; teacherName: string; initial?: AcademicHomework;
  onDone: () => void; onCancel: () => void;
}) {
  const { data: setup } = useQuery({
    queryKey: ['academic-teacher-setup', teacherId],
    queryFn: () => academicTeacherService.getSetup(teacherId),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['academic-schedules', teacherId],
    queryFn: () => academicTeacherService.listSchedules(teacherId),
  });

  const hasSchedules = schedules.length > 0;
  const isEditing = !!initial;

  const [date, setDate] = useState(initial?.date ?? getRiyadhDateString());
  const [level, setLevel] = useState<AcademicEducationLevel>(initial?.education_level ?? 'middle');
  const [grade, setGrade] = useState(initial?.grade ?? 1);
  const [sections, setSections] = useState<string[]>(initial?.sections ?? []);
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [topic, setTopic] = useState(initial?.lesson_topic ?? '');
  const [pageNumbers, setPageNumbers] = useState<number[]>(
    () => normalizeHomeworkPageNumbers(initial ?? {}),
  );
  const [pageInput, setPageInput] = useState('');
  const [text, setText] = useState(initial?.homework_text ?? '');
  const [saving, setSaving] = useState(false);

  const schoolDay = getSchoolDayFromDate(date);
  const scheduleMode = hasSchedules;

  const dayClasses = useMemo(() => {
    if (!scheduleMode || !schoolDay) return [];
    return teacherClassesForScheduleDay(schedules, schoolDay);
  }, [scheduleMode, schedules, schoolDay]);

  const teacherClasses = useMemo(() => {
    if (!scheduleMode) {
      return mergeTeacherClassRefs(setup, schedules);
    }
    if (isEditing) return mergeClassRefsWithInitial(dayClasses, initial);
    return dayClasses;
  }, [scheduleMode, dayClasses, setup, schedules, initial, isEditing]);

  /** لا حصص في التاريخ المختار — يمنع الإدخال الجديد */
  const noClassesForDate = scheduleMode && !isEditing && (!schoolDay || dayClasses.length === 0);

  const availableLevels = useMemo(() => teacherLevelsFromClasses(teacherClasses), [teacherClasses]);
  const availableGrades = useMemo(
    () => teacherGradesForLevel(teacherClasses, level),
    [teacherClasses, level],
  );

  const scheduleSubjects = useMemo(() => {
    if (!scheduleMode || !schoolDay) return [];
    return subjectsForClassOnDay(schedules, schoolDay, level, grade);
  }, [scheduleMode, schedules, schoolDay, level, grade]);

  const availableSections = useMemo(() => {
    if (scheduleMode && schoolDay && subject.trim()) {
      return sectionsForClassSubjectOnDay(schedules, schoolDay, level, grade, subject);
    }
    return teacherSectionsForGrade(teacherClasses, level, grade);
  }, [scheduleMode, schedules, schoolDay, level, grade, subject, teacherClasses]);

  const subjectOptions = useMemo(() => {
    if (scheduleMode) return scheduleSubjects;
    return subjectsFromTeacherSetup(setup, level, grade);
  }, [scheduleMode, scheduleSubjects, setup, level, grade]);

  useEffect(() => {
    if (!scheduleMode || isEditing) return;
    if (noClassesForDate) {
      setSubject('');
      setSections([]);
      return;
    }
    if (!teacherClasses.length) return;
    const ctx = pickInitialClass(teacherClasses);
    setLevel(ctx.level);
    setGrade(ctx.grade);
    setSections(ctx.sections);
    setSubject('');
  }, [scheduleMode, teacherClasses, isEditing, noClassesForDate, date]);

  useEffect(() => {
    if (!scheduleMode || !scheduleSubjects.length || noClassesForDate) return;
    if (!subject || !scheduleSubjects.includes(subject)) {
      setSubject(scheduleSubjects[0]);
    }
  }, [scheduleMode, scheduleSubjects, subject, noClassesForDate]);

  useEffect(() => {
    setSections((prev) => {
      const kept = prev.filter((s) => availableSections.includes(s));
      if (kept.length) return kept;
      return availableSections[0] ? [availableSections[0]] : [];
    });
  }, [availableSections]);

  useEffect(() => {
    if (!availableGrades.includes(grade)) {
      const nextGrade = availableGrades[0];
      if (nextGrade != null) setGrade(nextGrade);
    }
  }, [availableGrades, grade]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSchedules) {
      alert('أكمل الجدول الدراسي أولاً');
      return;
    }
    if (noClassesForDate) {
      alert(schoolDay ? `لا حصص لك يوم ${schoolDay}` : 'لا حصص في هذا اليوم — يوم عطلة');
      return;
    }
    if (scheduleMode && !teacherClasses.length) {
      alert('أكمل إعداد الملف التعليمي أولاً');
      return;
    }
    if (!sections.length) {
      alert('اختر فصلاً واحداً على الأقل');
      return;
    }
    const pendingPages = parsePageNumberInput(pageInput);
    const finalPages = [...new Set([...pageNumbers, ...pendingPages])].sort((a, b) => a - b);
    setSaving(true);
    try {
      const payload = {
        teacher_id: teacherId, teacher_name: teacherName, education_level: level,
        grade, sections, subject, lesson_topic: topic,
        page_numbers: finalPages,
        page_number: finalPages[0] ?? null,
        homework_text: text,
        type: initial?.type ?? 'grammar',
        date,
      };
      if (initial) await academicHomeworkService.update(initial.id, payload);
      else await academicHomeworkService.create(payload);
      onDone();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (s: string) => {
    setSections((prev) =>
      prev.includes(s) ? (prev.length > 1 ? prev.filter((x) => x !== s) : prev) : [...prev, s],
    );
  };

  const addPageNumbers = () => {
    const parsed = parsePageNumberInput(pageInput);
    if (!parsed.length) {
      alert('أدخل رقم صفحة صحيحاً (مثال: 45 أو 45، 46 أو 45-48)');
      return;
    }
    setPageNumbers((prev) => [...new Set([...prev, ...parsed])].sort((a, b) => a - b));
    setPageInput('');
  };

  const removePageNumber = (page: number) => {
    setPageNumbers((prev) => prev.filter((p) => p !== page));
  };

  return (
    <form onSubmit={submit}>
      <AcademicFormPanel title={initial ? 'تعديل واجب' : 'واجب جديد'}>
        {!hasSchedules ? (
          <div className="rounded-2xl border border-[#7551FF]/25 bg-[#7551FF]/10 p-5 text-center mb-4">
            <p className="text-white font-semibold mb-2">أكمل الجدول الدراسي أولاً</p>
            <p className="text-[#A3AED0] text-sm mb-4">
              لربط الواجبات بحصصك، سجّل جدولك الدراسي ثم عد لإدخال الواجب
            </p>
            <Link to="/academic/schedule" className={academicBtnPrimary}>
              إعداد الجدول الدراسي
            </Link>
          </div>
        ) : (
          <>
            <AcademicField label="التاريخ">
              <input
                type="date"
                className={academicInputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </AcademicField>

            {noClassesForDate ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-center mb-4 mt-4">
                <CalendarOff className="w-8 h-8 text-amber-300 mx-auto mb-3" />
                <p className="text-white font-semibold mb-2">
                  {schoolDay ? `ليس لديك حصص يوم ${schoolDay}` : 'ليس لديك حصص في هذا اليوم'}
                </p>
                <p className="text-[#A3AED0] text-sm mb-4">
                  {schoolDay
                    ? 'غيّر التاريخ إلى يوم فيه حصصك في الجدول الدراسي.'
                    : 'اليوم المختار عطلة — اختر يوماً دراسياً (الأحد–الخميس).'}
                </p>
                <Link to="/academic/schedule" className={academicBtnSecondary}>
                  الجدول الدراسي
                </Link>
              </div>
            ) : teacherClasses.length === 0 ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-center mb-4 mt-4">
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
                {scheduleMode && schoolDay && (
                  <p className="text-sm text-gold-400/90 font-medium mb-4 mt-4 rounded-xl bg-gold-500/10 border border-gold-400/20 px-3 py-2">
                    حصصك يوم {schoolDay} — {scheduleSubjects.length} مادة · {teacherClasses.length} فصل
                  </p>
                )}
                <div className={academicGrid2}>
                  <AcademicField label="المرحلة">
                {availableLevels.length <= 1 ? (
                  <div className="py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm font-semibold">
                    {ACADEMIC_LEVEL_LABELS[level]}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {availableLevels.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => { setLevel(l); setSubject(''); }}
                        className={clsx(
                          'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                          level === l
                            ? 'bg-gold-500 text-navy-950 border-gold-500'
                            : 'bg-white/5 text-white border-white/10 hover:border-white/20',
                        )}
                      >
                        {ACADEMIC_LEVEL_LABELS[l]}
                      </button>
                    ))}
                  </div>
                )}
              </AcademicField>

              <AcademicField label="الصف">
                <select
                  className={academicInputClass}
                  value={grade}
                  onChange={(e) => { setGrade(+e.target.value); setSubject(''); }}
                >
                  {availableGrades.map((g) => (
                    <option key={g} value={g}>{formatGradeLabel(level, g)}</option>
                  ))}
                </select>
              </AcademicField>

              <AcademicField label="المادة">
                {scheduleMode && scheduleSubjects.length > 0 ? (
                  <select
                    className={academicInputClass}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  >
                    <option value="">اختر المادة</option>
                    {scheduleSubjects.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <AcademicSubjectSelect
                    level={level}
                    grade={grade}
                    value={subject}
                    onChange={setSubject}
                    teacherSetupSubjects={subjectOptions}
                    required
                  />
                )}
              </AcademicField>

              <AcademicField label="الموضوع">
                <input className={academicInputClass} value={topic} onChange={(e) => setTopic(e.target.value)} required placeholder="مثال: الجملة الاسمية والفعلية" />
              </AcademicField>

              <AcademicField label="أرقام الصفحات">
                <div className="flex gap-2">
                  <input
                    className={academicInputClass}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPageNumbers();
                      }
                    }}
                    placeholder="مثال: 45 أو 45، 46 أو 45-48"
                    inputMode="numeric"
                  />
                  <button type="button" className={academicBtnSecondary} onClick={addPageNumbers}>
                    إضافة
                  </button>
                </div>
                <p className="text-[#A3AED0] text-xs mt-2">
                  يمكن إضافة أكثر من صفحة — اضغط Enter أو «إضافة» بعد كل رقم
                </p>
                {pageNumbers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pageNumbers.map((page) => (
                      <AcademicChip
                        key={page}
                        label={`ص ${page}`}
                        selected
                        onClick={() => removePageNumber(page)}
                      />
                    ))}
                  </div>
                )}
              </AcademicField>
            </div>

            <AcademicField label="الفصول">
              <p className="text-[#A3AED0] text-xs mb-2">
                {scheduleMode && subject.trim()
                  ? `فصول ${subject} يوم ${schoolDay} — ${formatGradeLabel(level, grade)}`
                  : `فصولك في ${formatGradeLabel(level, grade)} — يمكن اختيار أكثر من فصل`}
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                {availableSections.map((s) => (
                  <AcademicChip
                    key={s}
                    label={s}
                    selected={sections.includes(s)}
                    onClick={() => toggleSection(s)}
                  />
                ))}
              </div>
              {sections.length > 0 && (
                <p className="text-xs text-[#A3AED0] mt-2">
                  المحدد: {sections.map((s) => formatGradeSection(level, grade, s)).join(' · ')}
                </p>
              )}
            </AcademicField>
              </>
            )}
          </>
        )}

        {!noClassesForDate && teacherClasses.length > 0 && (
          <AcademicField label="نص الواجب">
            <textarea className={academicInputClass} rows={3} value={text} onChange={(e) => setText(e.target.value)} required />
          </AcademicField>
        )}

        <div className="mobile-form-footer">
          <button
            type="submit"
            className={academicBtnPrimary}
            disabled={saving || !hasSchedules || noClassesForDate || teacherClasses.length === 0 || !sections.length || (scheduleMode && !subject.trim())}
          >
            {saving ? 'جاري الإرسال...' : (initial ? 'تحديث' : 'حفظ وإرسال')}
          </button>
          <button type="button" className={academicBtnSecondary} onClick={onCancel}>إلغاء</button>
        </div>
      </AcademicFormPanel>
    </form>
  );
}
