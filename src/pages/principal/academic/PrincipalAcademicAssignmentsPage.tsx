import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { academicAdminService } from '../../../lib/academic/adminService';
import { syncAllTeachersOlympiadFromAcademic } from '../../../lib/academic/olympiadSyncService';
import { ACADEMIC_LEVEL_LABELS, DEFAULT_SECTIONS, gradesForLevel, formatGradeLabel } from '../../../lib/academic/constants';
import { subjectsForGrade } from '../../../lib/academic/subjectHelpers';
import type { AcademicEducationLevel } from '../../../lib/academic/types';
import {
  AcademicLayout, AcademicPageHeader, AcademicEmpty, AcademicFormPanel, AcademicField, AcademicChip,
  academicInputClass, academicBtnPrimary, academicBtnSecondary,
} from '../../../components/academic/AcademicUi';

export function PrincipalAcademicAssignmentsPage() {
  const qc = useQueryClient();
  const [teacherId, setTeacherId] = useState('');
  const [level, setLevel] = useState<AcademicEducationLevel>('middle');
  const [grade, setGrade] = useState(1);
  const [sections, setSections] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const {
    data: teachers = [],
    isLoading: teachersLoading,
    isError: teachersError,
    refetch: refetchTeachers,
  } = useQuery({
    queryKey: ['academic-teachers'],
    queryFn: () => academicAdminService.listTeachers({ includeInactive: true }),
    refetchOnMount: 'always',
  });

  const { data: allSubjects = [] } = useQuery({
    queryKey: ['academic-subjects'],
    queryFn: academicAdminService.listSubjects,
  });
  const { data: catalogSections = [] } = useQuery({
    queryKey: ['academic-sections'],
    queryFn: academicAdminService.listSections,
  });
  const { data: assignments = [] } = useQuery({
    queryKey: ['academic-assignments'],
    queryFn: academicAdminService.listAssignments,
  });

  const sectionOptions = useMemo(() => {
    const fromDb = catalogSections.map((s) => s.name).filter(Boolean);
    return fromDb.length > 0 ? fromDb : DEFAULT_SECTIONS;
  }, [catalogSections]);

  const activeTeachers = useMemo(
    () => teachers.filter((t) => t.is_active !== false),
    [teachers],
  );

  useEffect(() => {
    setGrade(gradesForLevel(level)[0]);
    setSubjects([]);
    setSections([]);
  }, [level]);

  useEffect(() => {
    setSubjects([]);
  }, [grade]);

  const gradeSubjects = subjectsForGrade(allSubjects, level, grade);

  const toggleSection = (sec: string) => {
    setSections((prev) =>
      prev.includes(sec) ? prev.filter((x) => x !== sec) : [...prev, sec],
    );
  };

  const saveMut = useMutation({
    mutationFn: () =>
      academicAdminService.saveAssignment({
        teacher_id: teacherId,
        education_level: level,
        subjects,
        grades_with_sections: { [String(grade)]: [...sections].sort((a, b) => a.localeCompare(b, 'ar')) },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-assignments'] });
      setTeacherId('');
      setSubjects([]);
      setSections([]);
    },
  });

  const deleteMut = useMutation({
    mutationFn: academicAdminService.deleteAssignment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-assignments'] }),
  });

  const syncAllMut = useMutation({
    mutationFn: syncAllTeachersOlympiadFromAcademic,
    onSuccess: (r) => {
      setSyncMsg(
        `تمت مزامنة النقاط لـ ${r.synced} معلم من ${r.total} (تخطي ${r.skipped}). المزامنة لا تضيف معلمين للقائمة — تظهر من حسابات دور «معلم».`,
      );
      void refetchTeachers();
    },
    onError: (e) => {
      setSyncMsg(e instanceof Error ? e.message : 'فشلت المزامنة');
    },
  });

  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.full_name ?? id;

  const assignmentLabel = (educationLevel: AcademicEducationLevel, gradesWithSections: Record<string, string[]>) => {
    const parts = Object.entries(gradesWithSections).map(([g, secs]) => {
      const gradeLabel = formatGradeLabel(educationLevel, +g);
      if (!secs?.length) return `${gradeLabel} (كل الفصول — حدّث الإسناد)`;
      return `${gradeLabel} / ${secs.join('، ')}`;
    });
    return parts.length ? parts.join(' · ') : '—';
  };

  return (
    <AcademicLayout size="4xl">
      <AcademicPageHeader
        title="إسناد المواد للمعلمين"
        subtitle="اختر المعلم ثم الصف والفصول والمواد — الفصل مطلوب حتى لا يختلط معلمو نفس الصف"
        backTo="/principal/academic"
        action={
          <button
            type="button"
            className={academicBtnSecondary}
            disabled={syncAllMut.isPending}
            onClick={() => syncAllMut.mutate()}
          >
            <RefreshCw className={clsx('w-4 h-4', syncAllMut.isPending && 'animate-spin')} />
            مزامنة نظام النقاط
          </button>
        }
      />

      {syncMsg && (
        <p className="text-sm text-[#A3AED0] mb-4 rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3">
          {syncMsg}
        </p>
      )}

      <AcademicFormPanel title="إسناد جديد">
        <AcademicField label={`المعلم (${activeTeachers.length})`}>
          {teachersLoading ? (
            <p className="text-white/40 text-sm">جاري تحميل المعلمين...</p>
          ) : teachersError ? (
            <p className="text-red-300 text-sm">تعذّر تحميل المعلمين — حدّث الصفحة</p>
          ) : activeTeachers.length === 0 ? (
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-3 text-sm text-amber-100 space-y-2">
              <p>لا يوجد معلمون نشطون في النظام.</p>
              <p className="text-amber-100/70 text-xs">
                أنشئ حساباً بدور «معلم» من إدارة المستخدمين، ثم ارجع هنا (أو حدّث الصفحة).
              </p>
              <div className="flex flex-wrap gap-2">
                <Link to="/principal/users" className={academicBtnSecondary}>
                  إدارة المستخدمين
                </Link>
                <button type="button" className={academicBtnSecondary} onClick={() => refetchTeachers()}>
                  <RefreshCw className="w-4 h-4" /> تحديث القائمة
                </button>
              </div>
              {teachers.some((t) => t.is_active === false) && (
                <p className="text-amber-200/80 text-xs">
                  يوجد {teachers.filter((t) => t.is_active === false).length} معلم معطّل — فعّله من إدارة المستخدمين ليظهر هنا.
                </p>
              )}
            </div>
          ) : (
            <select className={academicInputClass} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">اختر المعلم</option>
              {activeTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                  {t.email ? ` — ${t.email}` : ''}
                </option>
              ))}
            </select>
          )}
        </AcademicField>

        <div className="grid grid-cols-2 gap-3">
          <AcademicField label="المرحلة">
            <select
              className={academicInputClass}
              value={level}
              onChange={(e) => setLevel(e.target.value as AcademicEducationLevel)}
            >
              <option value="middle">{ACADEMIC_LEVEL_LABELS.middle}</option>
              <option value="high">{ACADEMIC_LEVEL_LABELS.high}</option>
            </select>
          </AcademicField>
          <AcademicField label="الصف">
            <select
              className={academicInputClass}
              value={grade}
              onChange={(e) => {
                setGrade(+e.target.value);
                setSubjects([]);
              }}
            >
              {gradesForLevel(level).map((g) => (
                <option key={g} value={g}>
                  {formatGradeLabel(level, g)}
                </option>
              ))}
            </select>
          </AcademicField>
        </div>

        <AcademicField label="الفصول (مطلوب)">
          <div className="flex flex-wrap gap-2 mt-1">
            {sectionOptions.map((sec) => (
              <AcademicChip
                key={sec}
                label={`فصل ${sec}`}
                selected={sections.includes(sec)}
                onClick={() => toggleSection(sec)}
              />
            ))}
          </div>
          {sections.length === 0 && (
            <p className="text-amber-300/80 text-xs mt-2">حدّد فصلاً واحداً على الأقل — نفس المادة قد يدرّسها أكثر من معلم لفصول مختلفة</p>
          )}
        </AcademicField>

        <AcademicField label={`مواد ${formatGradeLabel(level, grade)}`}>
          {gradeSubjects.length === 0 ? (
            <p className="text-[#A3AED0] text-sm">لا مواد لهذا الصف — أضفها من إدارة المواد</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {gradeSubjects.map((s) => (
                <AcademicChip
                  key={s.id}
                  label={s.name}
                  selected={subjects.includes(s.name)}
                  onClick={() =>
                    setSubjects(
                      subjects.includes(s.name)
                        ? subjects.filter((x) => x !== s.name)
                        : [...subjects, s.name],
                    )
                  }
                />
              ))}
            </div>
          )}
        </AcademicField>

        <button
          type="button"
          className={academicBtnPrimary}
          disabled={!teacherId || subjects.length === 0 || sections.length === 0 || saveMut.isPending}
          onClick={() => saveMut.mutate()}
        >
          <Plus className="w-4 h-4" />
          {saveMut.isPending ? 'جاري الحفظ...' : 'حفظ الإسناد'}
        </button>
        {saveMut.isError && (
          <p className="text-red-300 text-sm">
            {saveMut.error instanceof Error ? saveMut.error.message : 'تعذّر الحفظ'}
          </p>
        )}
      </AcademicFormPanel>

      {assignments.length === 0 ? (
        <AcademicEmpty message="لا إسنادات" />
      ) : (
        <ul className="space-y-2">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="horizon-card rounded-xl bg-[#111c44] p-3 text-white flex justify-between gap-2 border border-white/[0.04]"
            >
              <div>
                <strong>{teacherName(a.teacher_id)}</strong>
                <p className="text-[#A3AED0] text-sm">
                  {assignmentLabel(a.education_level, a.grades_with_sections)} — {a.subjects.join('، ')}
                </p>
              </div>
              <button type="button" className="text-red-400 shrink-0 p-2" onClick={() => deleteMut.mutate(a.id)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AcademicLayout>
  );
}
