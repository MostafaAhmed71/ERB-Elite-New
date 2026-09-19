import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  GraduationCap, Layers, School, DoorOpen, BookOpen,
  Check, ChevronLeft, ChevronRight, Sparkles, type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { academicAdminService, academicConfigService } from '../../lib/academic/adminService';
import { academicTeacherService } from '../../lib/academic/teacherService';
import {
  ACADEMIC_LEVEL_LABELS,
  MIDDLE_GRADES,
  HIGH_GRADES,
  DEFAULT_SECTIONS,
  formatGradeLabel,
} from '../../lib/academic/constants';
import { subjectsForGrade, gradeSectionKey, flattenSubjectsByGrade } from '../../lib/academic/subjectHelpers';
import type { AcademicEducationLevel } from '../../lib/academic/types';
import { academicBtnPrimary, academicBtnSecondary } from '../../components/academic/AcademicUi';
import { PLATFORM_NAME } from '../../lib/branding';

type StepDef = { key: string; label: string; icon: LucideIcon };

const STEPS: StepDef[] = [
  { key: 'welcome', label: 'مرحباً', icon: Sparkles },
  { key: 'levels', label: 'المراحل', icon: Layers },
  { key: 'grades', label: 'الصفوف', icon: GraduationCap },
  { key: 'sections', label: 'الفصول', icon: DoorOpen },
  { key: 'subjects', label: 'المواد', icon: BookOpen },
];

/* بطاقة اختيار كبيرة قابلة للنقر */
function SelectableCard({
  label,
  hint,
  icon: Icon,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  icon?: LucideIcon;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'group relative flex items-center gap-3 rounded-2xl border p-4 text-right transition-all duration-200',
        selected
          ? 'border-gold-400/60 bg-gold-500/10 shadow-lg shadow-gold-500/10'
          : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]',
      )}
    >
      {Icon && (
        <span
          className={clsx(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
            selected ? 'bg-gradient-to-br from-gold-500 to-gold-600 text-navy-950' : 'bg-white/[0.06] text-[#A3AED0]',
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-white">{label}</span>
        {hint && <span className="mt-0.5 block truncate text-xs text-[#A3AED0]">{hint}</span>}
      </span>
      <span
        className={clsx(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all',
          selected ? 'border-gold-400 bg-gold-400 text-navy-950' : 'border-white/20 text-transparent',
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    </button>
  );
}

/* شريحة اختيار مدمجة (للفصول والمواد) */
function SelectablePill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all',
        selected
          ? 'border-gold-400/60 bg-gold-500/15 text-gold-300'
          : 'border-white/[0.08] bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.06]',
      )}
    >
      {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      {label}
    </button>
  );
}

function StepHeading({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7551FF] to-[#422AFB] text-white shadow-lg">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-[#A3AED0]">{description}</p>
      </div>
    </div>
  );
}

export function AcademicTeacherSetupPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [levels, setLevels] = useState<AcademicEducationLevel[]>([]);
  const [gradesByLevel, setGradesByLevel] = useState<Record<string, number[]>>({});
  const [sectionsByGrade, setSectionsByGrade] = useState<Record<string, string[]>>({});
  const [subjectsByGrade, setSubjectsByGrade] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: existingSetup } = useQuery({
    queryKey: ['academic-teacher-setup', user?.id],
    queryFn: () => academicTeacherService.getSetup(user!.id),
    enabled: !!user,
  });

  const isEditing = !!existingSetup?.is_setup_complete;

  useEffect(() => {
    if (!existingSetup || hydrated) return;
    const levelsIn = (existingSetup.education_levels ?? []) as AcademicEducationLevel[];
    setLevels(levelsIn);
    setGradesByLevel(existingSetup.grades_by_level ?? {});
    setSectionsByGrade(existingSetup.sections_by_grade ?? {});
    const bag = existingSetup.subjects_by_grade;
    if (bag && Object.keys(bag).length > 0) {
      setSubjectsByGrade(bag);
    } else if (existingSetup.subjects?.length) {
      const next: Record<string, string[]> = {};
      for (const l of levelsIn) {
        for (const g of existingSetup.grades_by_level?.[l] ?? []) {
          next[gradeSectionKey(l, g)] = [...existingSetup.subjects];
        }
      }
      setSubjectsByGrade(next);
    }
    setHydrated(true);
    setStep((s) => (existingSetup.is_setup_complete && s === 0 ? 1 : s));
  }, [existingSetup, hydrated]);

  const { data: enabledLevels = ['middle', 'high'] as AcademicEducationLevel[] } = useQuery({
    queryKey: ['academic-enabled-levels'],
    queryFn: () => academicConfigService.getEnabledLevels(),
  });

  const { data: allSubjects = [] } = useQuery({
    queryKey: ['academic-subjects'],
    queryFn: academicAdminService.listSubjects,
  });

  const availableLevels = (enabledLevels.length ? enabledLevels : ['middle', 'high']) as AcademicEducationLevel[];

  const toggleLevel = (level: AcademicEducationLevel) => {
    setLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  };

  const selectedGradeCount = useMemo(
    () => levels.reduce((n, l) => n + (gradesByLevel[l]?.length ?? 0), 0),
    [levels, gradesByLevel],
  );

  const selectedSectionCount = useMemo(
    () => Object.values(sectionsByGrade).reduce((n, s) => n + s.length, 0),
    [sectionsByGrade],
  );

  const canProceed = useMemo(() => {
    switch (step) {
      case 0: return true;
      case 1: return levels.length > 0;
      case 2: return selectedGradeCount > 0;
      case 3: return selectedSectionCount > 0;
      case 4: return flattenSubjectsByGrade(subjectsByGrade).length > 0;
      default: return true;
    }
  }, [step, levels, selectedGradeCount, selectedSectionCount, subjectsByGrade]);

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await academicTeacherService.saveSetup({
        id: existingSetup?.id,
        teacher_id: user.id,
        education_levels: levels,
        grades_by_level: gradesByLevel,
        sections_by_grade: sectionsByGrade,
        subjects: flattenSubjectsByGrade(subjectsByGrade),
        subjects_by_grade: subjectsByGrade,
        is_setup_complete: true,
      });
      navigate(isEditing ? '/academic' : '/academic/schedule?setup=1');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const isLast = step === STEPS.length - 1;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-950 p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(circle at 15% 15%, rgba(117,81,255,0.22) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(240,180,41,0.12) 0%, transparent 42%)',
        }}
      />

      <div className="relative w-full max-w-2xl">
        {/* رأس العلامة */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-500 to-gold-600 text-navy-950 shadow-lg shadow-gold-500/25">
            <School className="h-7 w-7" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isEditing ? 'تعديل الملف التعليمي' : 'إعداد الملف التعليمي'}
          </h1>
          <p className="mt-1 text-sm text-[#A3AED0]">
            {isEditing
              ? 'يمكنك تغيير المراحل والصفوف والفصول والمواد في أي وقت'
              : `${PLATFORM_NAME} · خطوات سريعة لتهيئة فصولك وموادك`}
          </p>
        </div>

        {/* مؤشر الخطوات */}
        <div className="mb-6 flex items-center justify-center">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const StepIcon = s.icon;
            return (
              <div key={s.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={clsx(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                      active && 'border-gold-400 bg-gold-500/15 text-gold-300 shadow-lg shadow-gold-500/20',
                      done && 'border-[#01B574] bg-[#01B574] text-on-contrast',
                      !active && !done && 'border-white/15 bg-white/[0.03] text-[#A3AED0]',
                    )}
                  >
                    {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <StepIcon className="h-4 w-4" strokeWidth={2} />}
                  </div>
                  <span
                    className={clsx(
                      'mt-1.5 hidden text-[11px] font-semibold sm:block',
                      active ? 'text-gold-300' : done ? 'text-[#01B574]' : 'text-[#A3AED0]',
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={clsx(
                      'mx-1.5 h-0.5 w-6 rounded-full transition-colors duration-300 sm:w-10',
                      i < step ? 'bg-[#01B574]' : 'bg-white/10',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* بطاقة المحتوى */}
        <div className="rounded-[24px] bg-[#111c44] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="min-h-[280px]">
            {step === 0 && (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#7551FF] to-[#422AFB] text-white shadow-xl">
                  <Sparkles className="h-8 w-8" strokeWidth={1.8} />
                </div>
                <h2 className="text-xl font-bold text-white">
                  أهلاً <span className="text-gold-400">{user?.full_name}</span> 👋
                </h2>
                <p className="mt-3 max-w-md leading-relaxed text-[#A3AED0]">
                  سنحدّد معاً المراحل والصفوف والفصول والمواد التي تدرّسها،
                  ليظهر لك في التطبيق ما يخصّك فقط. لن يستغرق الأمر سوى دقيقة.
                </p>
                <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
                  {STEPS.slice(1).map((s) => (
                    <div
                      key={s.key}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3"
                    >
                      <s.icon className="h-5 w-5 text-gold-400" strokeWidth={1.8} />
                      <span className="text-xs font-semibold text-[#A3AED0]">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <>
                <StepHeading
                  icon={Layers}
                  title="اختر مراحلك التعليمية"
                  description="حدّد المرحلة أو المراحل التي تدرّس فيها. يمكنك اختيار أكثر من واحدة."
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {availableLevels.map((l) => (
                    <SelectableCard
                      key={l}
                      label={ACADEMIC_LEVEL_LABELS[l]}
                      hint={l === 'middle' ? 'الصفوف الأول – الثالث المتوسط' : 'الصفوف الأول – الثالث الثانوي'}
                      icon={School}
                      selected={levels.includes(l)}
                      onClick={() => toggleLevel(l)}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <StepHeading
                  icon={GraduationCap}
                  title="اختر الصفوف"
                  description="حدّد الصفوف التي تدرّسها ضمن كل مرحلة."
                />
                <div className="space-y-5">
                  {levels.map((l) => (
                    <div key={l}>
                      <p className="mb-2.5 flex items-center gap-2 text-sm font-bold text-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
                        {ACADEMIC_LEVEL_LABELS[l]}
                      </p>
                      <div className="grid gap-2.5 sm:grid-cols-3">
                        {(l === 'middle' ? MIDDLE_GRADES : HIGH_GRADES).map((g) => (
                          <SelectableCard
                            key={g}
                            label={formatGradeLabel(l, g)}
                            selected={gradesByLevel[l]?.includes(g) ?? false}
                            onClick={() =>
                              setGradesByLevel({
                                ...gradesByLevel,
                                [l]: gradesByLevel[l]?.includes(g)
                                  ? gradesByLevel[l].filter((x) => x !== g)
                                  : [...(gradesByLevel[l] ?? []), g],
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <StepHeading
                  icon={DoorOpen}
                  title="اختر الفصول"
                  description="حدّد الفصول التي تدرّسها لكل صف اخترته."
                />
                <div className="space-y-4">
                  {levels.flatMap((l) =>
                    (gradesByLevel[l] ?? []).map((g) => {
                      const key = `${l}_${g}`;
                      return (
                        <div key={key} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <p className="mb-3 text-sm font-bold text-white">{formatGradeLabel(l, g)}</p>
                          <div className="flex flex-wrap gap-2">
                            {DEFAULT_SECTIONS.map((s) => (
                              <SelectablePill
                                key={s}
                                label={`فصل ${s}`}
                                selected={sectionsByGrade[key]?.includes(s) ?? false}
                                onClick={() =>
                                  setSectionsByGrade({
                                    ...sectionsByGrade,
                                    [key]: sectionsByGrade[key]?.includes(s)
                                      ? sectionsByGrade[key].filter((x) => x !== s)
                                      : [...(sectionsByGrade[key] ?? []), s],
                                  })
                                }
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }),
                  )}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <StepHeading
                  icon={BookOpen}
                  title="اختر موادك"
                  description="اختر مواد كل صف على حدة. المادة التي تختارها لصف لا تظهر تلقائياً في صفوف أخرى."
                />
                <div className="space-y-4">
                  {levels.flatMap((l) =>
                    (gradesByLevel[l] ?? []).map((g) => {
                      const gradeKey = gradeSectionKey(l, g);
                      const gradePicked = subjectsByGrade[gradeKey] ?? [];
                      const gradeSubjects = subjectsForGrade(allSubjects, l, g);
                      if (gradeSubjects.length === 0) return null;
                      return (
                        <div key={gradeKey} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <p className="mb-3 text-sm font-bold text-white">{formatGradeLabel(l, g)}</p>
                          <div className="flex flex-wrap gap-2">
                            {gradeSubjects.map((s) => (
                              <SelectablePill
                                key={s.id}
                                label={s.name}
                                selected={gradePicked.includes(s.name)}
                                onClick={() =>
                                  setSubjectsByGrade({
                                    ...subjectsByGrade,
                                    [gradeKey]: gradePicked.includes(s.name)
                                      ? gradePicked.filter((x) => x !== s.name)
                                      : [...gradePicked, s.name],
                                  })
                                }
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }),
                  )}
                </div>
              </>
            )}
          </div>

          {/* ملخص مباشر */}
          {step > 0 && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4 text-xs text-[#A3AED0]">
              <span className="rounded-full bg-white/[0.05] px-3 py-1">
                المراحل: <b className="text-white">{levels.length}</b>
              </span>
              <span className="rounded-full bg-white/[0.05] px-3 py-1">
                الصفوف: <b className="text-white">{selectedGradeCount}</b>
              </span>
              <span className="rounded-full bg-white/[0.05] px-3 py-1">
                الفصول: <b className="text-white">{selectedSectionCount}</b>
              </span>
              <span className="rounded-full bg-white/[0.05] px-3 py-1">
                المواد: <b className="text-white">{flattenSubjectsByGrade(subjectsByGrade).length}</b>
              </span>
            </div>
          )}

          {/* أزرار التنقل */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
            <div>
              {step > 0 && (
                <button type="button" className={academicBtnSecondary} onClick={() => setStep(step - 1)}>
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </button>
              )}
            </div>

            <span className="text-xs font-medium text-[#A3AED0]">
              الخطوة {step + 1} من {STEPS.length}
            </span>

            {isLast ? (
              <button
                type="button"
                className={academicBtnPrimary}
                disabled={saving || !canProceed}
                onClick={finish}
              >
                {saving ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'إنهاء الإعداد'}
                {!saving && <Check className="h-4 w-4" strokeWidth={3} />}
              </button>
            ) : (
              <button
                type="button"
                className={academicBtnPrimary}
                disabled={!canProceed}
                onClick={() => setStep(step + 1)}
              >
                التالي
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
