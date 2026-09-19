import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { CalendarCheck, CheckCircle2, ClipboardList, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { useAuthStore } from '../../stores/authStore';
import type { AcademicEducationLevel } from '../../lib/academic/types';
import { ACADEMIC_LEVEL_LABELS } from '../../lib/academic/constants';
import {
  fetchClassDayStatuses,
  fetchClassStudents,
  fetchExistingClassAttendance,
  fetchStageClassKeys,
  saveClassDailyAttendance,
  type AttendanceDayStatus,
} from '../../lib/academic/classAttendance';

type Tab = 'daily' | 'status';

export function DeputyAttendancePage() {
  const user = useAuthStore((s) => s.user);
  const level = (user?.staff_education_level ?? null) as AcademicEducationLevel | null;
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('daily');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [marks, setMarks] = useState<Record<string, AttendanceDayStatus>>({});

  const { data: classKeys = [], isLoading: loadingKeys } = useQuery({
    queryKey: ['deputy-attendance-classes', level],
    queryFn: () => fetchStageClassKeys(level!),
    enabled: !!level,
  });

  const grades = useMemo(
    () => [...new Set(classKeys.map((c) => c.grade))].sort((a, b) => a.localeCompare(b, 'ar')),
    [classKeys],
  );

  const classesForGrade = useMemo(
    () => classKeys.filter((c) => c.grade === grade).map((c) => c.class_name),
    [classKeys, grade],
  );

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['deputy-attendance-students', grade, className],
    queryFn: () => fetchClassStudents(grade, className),
    enabled: !!grade && !!className,
  });

  const { data: existing } = useQuery({
    queryKey: ['deputy-attendance-existing', date, grade, className, students.map((s) => s.id).join(',')],
    queryFn: () => fetchExistingClassAttendance(date, students.map((s) => s.id)),
    enabled: students.length > 0 && !!date,
  });

  useEffect(() => {
    if (!students.length) {
      setMarks({});
      return;
    }
    const next: Record<string, AttendanceDayStatus> = {};
    for (const s of students) {
      next[s.id] = existing?.[s.id] ?? 'present';
    }
    setMarks(next);
  }, [students, existing]);

  const { data: dayStatus = [], isLoading: loadingStatus } = useQuery({
    queryKey: ['deputy-attendance-day-status', level, date],
    queryFn: () => fetchClassDayStatuses(level!, date),
    enabled: !!level && tab === 'status',
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!level) throw new Error('مرحلة غير محددة');
      const records = students.map((s) => ({
        student_id: s.id,
        status: marks[s.id] ?? 'present',
      }));
      return saveClassDailyAttendance({
        date,
        grade,
        className,
        educationLevel: level,
        records,
      });
    },
    onSuccess: (res) => {
      toast.success(`تم حفظ الغياب — حاضر ${res.present} · غائب ${res.absent}`);
      qc.invalidateQueries({ queryKey: ['deputy-attendance'] });
      qc.invalidateQueries({ queryKey: ['deputy-attendance-day-status'] });
      qc.invalidateQueries({ queryKey: ['deputy-attendance-existing'] });
      qc.invalidateQueries({ queryKey: ['principal-attendance'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!level) {
    return (
      <div className="space-y-4" dir="rtl">
        <PageHeader title="الحضور والغياب" subtitle="فصول مرحلتك" icon={CalendarCheck} />
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          لم يُحدَّد مستوى المرحلة في ملفك. اطلب من المدير ضبطه من إدارة الطاقم.
          <div className="mt-3">
            <Link to="/support" className="text-gold-400 font-semibold underline">
              الدعم
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const presentCount = Object.values(marks).filter((s) => s === 'present').length;
  const absentCount = Object.values(marks).filter((s) => s === 'absent').length;
  const doneCount = dayStatus.filter((c) => c.done).length;
  const pendingCount = dayStatus.filter((c) => !c.done).length;

  return (
    <div className="space-y-5 pb-28" dir="rtl">
      <PageHeader
        title="الحضور والغياب"
        subtitle={`مرحلة ${ACADEMIC_LEVEL_LABELS[level]} فقط`}
        icon={CalendarCheck}
      />

      <div className="flex gap-2 border-b border-white/10">
        {(
          [
            { id: 'daily' as const, label: 'تسجيل الغياب اليومي', icon: ClipboardList },
            { id: 'status' as const, label: 'حالة الفصول', icon: CheckCircle2 },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === id
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-white/40 hover:text-white/80',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
            />
            <select
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value);
                setClassName('');
              }}
              disabled={loadingKeys}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm min-w-[140px]"
            >
              <option value="" className="bg-navy-900">
                اختر الصف
              </option>
              {grades.map((g) => (
                <option key={g} value={g} className="bg-navy-900">
                  {g}
                </option>
              ))}
            </select>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              disabled={!grade}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm min-w-[120px]"
            >
              <option value="" className="bg-navy-900">
                اختر الفصل
              </option>
              {classesForGrade.map((c) => (
                <option key={c} value={c} className="bg-navy-900">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {grade && className && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-3 text-sm">
                  <span className="text-emerald-300">حاضر: {presentCount}</span>
                  <span className="text-red-300">غائب: {absentCount}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next: Record<string, AttendanceDayStatus> = {};
                    for (const s of students) next[s.id] = 'present';
                    setMarks(next);
                  }}
                  disabled={students.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-sm font-bold disabled:opacity-40"
                >
                  <UserCheck className="w-4 h-4" />
                  تحضير الكل
                </button>
              </div>

              {loadingStudents ? (
                <TapHandLoader label="جاري تحميل الطلاب..." />
              ) : students.length === 0 ? (
                <p className="text-center text-white/45 text-sm py-10">لا طلاب في هذا الفصل</p>
              ) : (
                <ul className="space-y-2">
                  {students.map((s) => {
                    const status = marks[s.id] ?? 'present';
                    return (
                      <li
                        key={s.id}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-secondary)] flex items-center justify-center text-on-contrast font-bold shrink-0">
                          {s.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">{s.full_name}</p>
                          <p className="text-white/35 text-xs" dir="ltr">
                            {s.admission_number}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setMarks((m) => ({ ...m, [s.id]: 'present' }))}
                            className={clsx(
                              'px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                              status === 'present'
                                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                                : 'border-white/10 text-white/35',
                            )}
                          >
                            حضور
                          </button>
                          <button
                            type="button"
                            onClick={() => setMarks((m) => ({ ...m, [s.id]: 'absent' }))}
                            className={clsx(
                              'px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                              status === 'absent'
                                ? 'bg-red-500/25 border-red-400 text-red-200'
                                : 'border-white/10 text-white/35',
                            )}
                          >
                            غياب
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {students.length > 0 && (
                <div className="fixed bottom-20 inset-x-0 z-30 px-4 sm:static sm:px-0 sm:pt-2">
                  <button
                    type="button"
                    onClick={() => saveMut.mutate()}
                    disabled={saveMut.isPending}
                    className="w-full sm:w-auto sm:min-w-[220px] mx-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-400 text-navy-950 font-extrabold shadow-lg shadow-gold-500/20 disabled:opacity-50"
                  >
                    <UserX className="w-5 h-5" />
                    {saveMut.isPending ? 'جاري الحفظ...' : 'حفظ الغياب'}
                  </button>
                </div>
              )}
            </>
          )}

          {!grade || !className ? (
            <p className="text-center text-white/40 text-sm py-12">
              اختر الصف ثم الفصل لعرض الطلاب وتسجيل الغياب
            </p>
          ) : null}
        </div>
      )}

      {tab === 'status' && (
        <div className="space-y-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-200">{doneCount}</p>
              <p className="text-xs text-white/50 mt-1">فصول مكتملة</p>
            </div>
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-center">
              <p className="text-2xl font-bold text-amber-200">{pendingCount}</p>
              <p className="text-xs text-white/50 mt-1">فصول متبقية</p>
            </div>
          </div>
          {loadingStatus ? (
            <TapHandLoader label="جاري التحميل..." />
          ) : (
            <ul className="space-y-2">
              {dayStatus.map((c) => (
                <li
                  key={`${c.grade}-${c.class_name}`}
                  className={clsx(
                    'rounded-xl border px-4 py-3 flex items-center justify-between gap-3',
                    c.done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/[0.03]',
                  )}
                >
                  <div>
                    <p className="text-white font-semibold">
                      {c.grade} — {c.class_name}
                    </p>
                    <p className="text-xs text-white/40">{c.student_count} طالباً</p>
                  </div>
                  {c.done ? (
                    <span className="text-xs font-bold text-emerald-300">
                      مكتمل · غائب {c.session?.absent_count ?? 0}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="text-xs font-bold text-gold-400"
                      onClick={() => {
                        setGrade(c.grade);
                        setClassName(c.class_name);
                        setTab('daily');
                      }}
                    >
                      تسجيل الآن
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
