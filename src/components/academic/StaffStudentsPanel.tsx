import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Download, Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { PageHeader } from '../ui/PageHeader';
import { TapHandLoader } from '../ui/TapHandLoader';
import { SearchInput } from '../ui/SearchInput';
import { ACADEMIC_LEVEL_LABELS } from '../../lib/academic/constants';
import type { AcademicEducationLevel } from '../../lib/academic/types';
import {
  computeStudentTotals,
  fetchScopedClassKeys,
  listStaffStudents,
  transferStudentClass,
  type StaffStudentRow,
} from '../../lib/academic/staffStudents';
import { useGradeClassCatalog } from '../../hooks/useGradeClassCatalog';
import { gradeBelongsToEducationLevel } from '../../lib/academic/stageScope';
import { exportStudentsRosterExcel } from '../../lib/olympiadMiddleScope';

type Props = {
  /** null = كل المدرسة (مدير) */
  level: AcademicEducationLevel | null;
  title?: string;
  subtitle?: string;
  requireLevel?: boolean;
};

export function StaffStudentsPanel({
  level,
  title = 'الطلاب',
  subtitle,
  requireLevel = false,
}: Props) {
  const qc = useQueryClient();
  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [search, setSearch] = useState('');
  const [transferTarget, setTransferTarget] = useState<StaffStudentRow | null>(null);
  const [destGrade, setDestGrade] = useState('');
  const [destClass, setDestClass] = useState('');

  const { data: catalog } = useGradeClassCatalog();

  const { data: classKeys = [], isLoading: loadingKeys } = useQuery({
    queryKey: ['staff-students-class-keys', level ?? 'all'],
    queryFn: () => fetchScopedClassKeys(level),
    enabled: !requireLevel || !!level,
  });

  const grades = useMemo(
    () => [...new Set(classKeys.map((c) => c.grade))].sort((a, b) => a.localeCompare(b, 'ar')),
    [classKeys],
  );

  const classesForGrade = useMemo(
    () => classKeys.filter((c) => c.grade === grade).map((c) => c.class_name),
    [classKeys, grade],
  );

  const totals = useMemo(
    () =>
      computeStudentTotals(
        classKeys,
        grade,
        className,
        level ? ACADEMIC_LEVEL_LABELS[level] : 'المدرسة',
      ),
    [classKeys, grade, className, level],
  );

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['staff-students-list', level ?? 'all', grade, className, search],
    queryFn: () =>
      listStaffStudents({
        level,
        grade: grade || undefined,
        className: className || undefined,
        search: search || undefined,
      }),
    enabled: !requireLevel || !!level,
  });

  const catalogGrades = useMemo(() => {
    const raw = catalog?.grades ?? [];
    if (!level) return raw;
    return raw.filter((g) => gradeBelongsToEducationLevel(g, level));
  }, [catalog, level]);

  const destClasses = useMemo(() => {
    if (!destGrade) return [] as string[];
    const fromCatalog = catalog?.classesByGrade?.[destGrade] ?? catalog?.allClasses ?? [];
    const fromKeys = classKeys.filter((c) => c.grade === destGrade).map((c) => c.class_name);
    return [...new Set([...fromCatalog, ...fromKeys])].sort((a, b) => a.localeCompare(b, 'ar'));
  }, [catalog, classKeys, destGrade]);

  const transferMut = useMutation({
    mutationFn: () => {
      if (!transferTarget) throw new Error('اختر طالباً');
      return transferStudentClass(transferTarget.id, destGrade, destClass);
    },
    onSuccess: (res) => {
      toast.success(
        `تم النقل إلى ${res.to_grade} / ${res.to_class} — النقاط الفردية ${res.approved_points} بقيت مع الطالب`,
      );
      setTransferTarget(null);
      setDestGrade('');
      setDestClass('');
      qc.invalidateQueries({ queryKey: ['staff-students'] });
      qc.invalidateQueries({ queryKey: ['staff-students-list'] });
      qc.invalidateQueries({ queryKey: ['staff-students-class-keys'] });
      qc.invalidateQueries({ queryKey: ['deputy-attendance'] });
      qc.invalidateQueries({ queryKey: ['principal', 'class-students'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (requireLevel && !level) {
    return (
      <div className="space-y-4" dir="rtl">
        <PageHeader title={title} subtitle={subtitle} icon={Users} />
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          لم يُحدَّد مستوى المرحلة في ملفك. اطلب من المدير ضبطه من إدارة المستخدمين أو الموظفين الأكاديميين.
          <div className="mt-3">
            <Link to="/support" className="text-gold-400 font-semibold underline">
              الدعم
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const openTransfer = (s: StaffStudentRow) => {
    setTransferTarget(s);
    setDestGrade(s.grade);
    setDestClass('');
  };

  const handleExportExcel = () => {
    if (students.length === 0) {
      toast.error('لا يوجد طلاب للتصدير');
      return;
    }
    try {
      const count = exportStudentsRosterExcel(students);
      toast.success(`تم تصدير ${count} طالباً إلى Excel`);
    } catch {
      toast.error('فشل تصدير الملف');
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        title={title}
        subtitle={
          subtitle ??
          (level
            ? `طلاب مرحلة ${ACADEMIC_LEVEL_LABELS[level]} — نقل الفصول مع بقاء النقاط الفردية`
            : 'كل طلاب المدرسة — نقل الفصول مع بقاء النقاط الفردية')
        }
        icon={Users}
        actions={
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={students.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            تصدير Excel ({students.length})
          </button>
        }
      />

      <div className="rounded-2xl border border-gold-400/25 bg-gradient-to-l from-gold-500/15 to-transparent px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-white/50 text-xs mb-1">{totals.label}</p>
          <p className="text-3xl font-black text-gold-300 tabular-nums">{totals.count}</p>
        </div>
        {level && (
          <span className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/60">
            {ACADEMIC_LEVEL_LABELS[level]}
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-white/50 text-xs">الصف</label>
          <select
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value);
              setClassName('');
            }}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm appearance-none"
          >
            <option value="" className="bg-navy-900">
              كل الصفوف
            </option>
            {grades.map((g) => (
              <option key={g} value={g} className="bg-navy-900">
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-white/50 text-xs">الفصل</label>
          <select
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            disabled={!grade}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm appearance-none disabled:opacity-40"
          >
            <option value="" className="bg-navy-900">
              كل الفصول
            </option>
            {classesForGrade.map((c) => (
              <option key={c} value={c} className="bg-navy-900">
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-white/50 text-xs flex items-center gap-1">
            <Search className="w-3.5 h-3.5" /> بحث
          </label>
          <SearchInput value={search} onChange={setSearch} placeholder="اسم أو رقم هوية" />
        </div>
      </div>

      {loadingKeys || loadingStudents ? (
        <TapHandLoader label="جاري تحميل الطلاب..." />
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/45 text-sm">
          لا يوجد طلاب في هذا النطاق
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr className="text-white/45 text-right">
                  <th className="px-4 py-3 font-medium">الطالب</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">الهوية</th>
                  <th className="px-4 py-3 font-medium">الصف / الفصل</th>
                  <th className="px-4 py-3 font-medium">النقاط</th>
                  <th className="px-4 py-3 font-medium">نقل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-white font-medium">{s.full_name}</td>
                    <td className="px-4 py-3 text-white/45 font-mono text-xs hidden sm:table-cell" dir="ltr">
                      {s.national_id || s.admission_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-white/70 text-xs">
                      {s.grade}
                      <span className="text-white/30 mx-1">·</span>
                      فصل {s.class_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gold-300 font-bold tabular-nums">{s.points}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openTransfer(s)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300 hover:text-sky-200 border border-sky-400/30 rounded-lg px-2.5 py-1.5 hover:bg-sky-500/10 transition-colors"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        نقل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 text-[11px] text-white/35 border-t border-white/5">
            النقاط الفردية (من المعلم أو رائد النشاط) مرتبطة بالطالب وتبقى معه بعد النقل إلى أي فصل.
          </p>
        </div>
      )}

      {transferTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-navy-900 p-5 space-y-4 shadow-2xl">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-gold-400" />
              نقل الطالب
            </h3>
            <p className="text-white/70 text-sm">
              <span className="text-white font-semibold">{transferTarget.full_name}</span>
              <span className="text-white/40"> — حالياً </span>
              {transferTarget.grade} / فصل {transferTarget.class_name}
            </p>
            <p className="text-gold-300/90 text-xs">
              النقاط الفردية الحالية: {transferTarget.points} — ستنتقل معه كما هي.
            </p>
            <div className="space-y-1.5">
              <label className="text-white/50 text-xs">الصف الجديد</label>
              <select
                value={destGrade}
                onChange={(e) => {
                  setDestGrade(e.target.value);
                  setDestClass('');
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm appearance-none"
              >
                <option value="" className="bg-navy-900">
                  اختر الصف
                </option>
                {[...new Set([...catalogGrades, ...grades])].map((g) => (
                  <option key={g} value={g} className="bg-navy-900">
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-white/50 text-xs">الفصل الجديد</label>
              <select
                value={destClass}
                onChange={(e) => setDestClass(e.target.value)}
                disabled={!destGrade}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm appearance-none disabled:opacity-40"
              >
                <option value="" className="bg-navy-900">
                  اختر الفصل
                </option>
                {destClasses.map((c) => (
                  <option key={c} value={c} className="bg-navy-900">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTransferTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!destGrade || !destClass || transferMut.isPending}
                onClick={() => transferMut.mutate()}
                className={clsx(
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold',
                  'bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950',
                  'disabled:opacity-50',
                )}
              >
                {transferMut.isPending ? 'جارٍ النقل...' : 'تأكيد النقل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
