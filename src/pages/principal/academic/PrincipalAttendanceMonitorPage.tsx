import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { CalendarCheck, MessageCircle, BarChart3, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../../../components/ui/PageHeader';
import { TapHandLoader } from '../../../components/ui/TapHandLoader';
import {
  fetchSchoolDayAttendanceOverview,
  remindDeputiesPendingAttendance,
} from '../../../lib/academic/classAttendance';
import { ACADEMIC_LEVEL_LABELS } from '../../../lib/academic/constants';
import type { AcademicEducationLevel } from '../../../lib/academic/types';

type Tab = 'monitor' | 'reports';

export function PrincipalAttendanceMonitorPage() {
  const [tab, setTab] = useState<Tab>('monitor');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [levelFilter, setLevelFilter] = useState<'' | AcademicEducationLevel>('');

  const { data, isLoading } = useQuery({
    queryKey: ['principal-attendance', date],
    queryFn: () => fetchSchoolDayAttendanceOverview(date),
  });

  const filtered = useMemo(() => {
    if (!data) return null;
    if (!levelFilter) return data;
    const rows = data.rows.filter((r) => r.level === levelFilter);
    return {
      ...data,
      rows,
      done: rows.filter((r) => r.done),
      pending: rows.filter((r) => !r.done),
      totalClasses: rows.length,
      absentTotal: rows.filter((r) => r.done).reduce((s, r) => s + (r.session?.absent_count ?? 0), 0),
    };
  }, [data, levelFilter]);

  const remindMut = useMutation({
    mutationFn: () =>
      remindDeputiesPendingAttendance({
        date,
        level: levelFilter || null,
      }),
    onSuccess: (res) => {
      if (res.sent === 0 && res.failed === 0) {
        toast.success('لا فصول متبقية للتذكير');
        return;
      }
      toast.success(`تذكير واتساب: أُرسل ${res.sent} · فشل ${res.failed}`);
      if (res.errors[0]) toast.error(res.errors[0]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        title="متابعة الغياب اليومي"
        subtitle="اكتمال الفصول بعد تسجيل الوكلاء · تقارير وتذكير واتساب"
        icon={CalendarCheck}
      />

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
        />
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as '' | AcademicEducationLevel)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
        >
          <option value="" className="bg-navy-900">
            كل المراحل
          </option>
          <option value="middle" className="bg-navy-900">
            {ACADEMIC_LEVEL_LABELS.middle}
          </option>
          <option value="high" className="bg-navy-900">
            {ACADEMIC_LEVEL_LABELS.high}
          </option>
        </select>
        <button
          type="button"
          onClick={() => remindMut.mutate()}
          disabled={remindMut.isPending || (filtered?.pending.length ?? 0) === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-sm font-bold disabled:opacity-40"
        >
          <MessageCircle className="w-4 h-4" />
          {remindMut.isPending ? 'جاري الإرسال...' : 'تذكير واتساب للوكلاء (فصول متبقية)'}
        </button>
      </div>

      <div className="flex gap-2 border-b border-white/10">
        {(
          [
            { id: 'monitor' as const, label: 'متابعة اليوم', icon: ClipboardList },
            { id: 'reports' as const, label: 'تقارير الغياب', icon: BarChart3 },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px',
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

      {isLoading || !filtered ? (
        <TapHandLoader label="جاري التحميل..." />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="إجمالي الفصول" value={filtered.totalClasses} />
            <Stat label="مكتملة" value={filtered.done.length} tone="ok" />
            <Stat label="متبقية" value={filtered.pending.length} tone="warn" />
            <Stat label="إجمالي الغياب" value={filtered.absentTotal} tone="danger" />
          </div>

          {tab === 'monitor' && (
            <div className="grid lg:grid-cols-2 gap-4">
              <Section title="فصول مكتملة" empty="لا فصول مكتملة لهذا اليوم">
                {filtered.done.map((c) => (
                  <li
                    key={`${c.grade}-${c.class_name}`}
                    className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3"
                  >
                    <p className="text-white font-semibold">
                      {c.grade} / {c.class_name}
                      <span className="text-white/40 text-xs font-normal mr-2">
                        · {ACADEMIC_LEVEL_LABELS[c.level]}
                      </span>
                    </p>
                    <p className="text-xs text-white/45 mt-1">
                      غائب {c.session?.absent_count ?? 0} من {c.session?.student_count ?? c.student_count}
                      {c.session?.recorder_name ? ` · بواسطة ${c.session.recorder_name}` : ''}
                    </p>
                  </li>
                ))}
              </Section>
              <Section title="فصول لم يُؤخذ غيابها" empty="أحسنت — لا فصول متبقية">
                {filtered.pending.map((c) => (
                  <li
                    key={`${c.grade}-${c.class_name}`}
                    className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3"
                  >
                    <p className="text-white font-semibold">
                      {c.grade} / {c.class_name}
                    </p>
                    <p className="text-xs text-white/45 mt-1">
                      {c.student_count} طالباً · {ACADEMIC_LEVEL_LABELS[c.level]} · بانتظار الوكيل
                    </p>
                  </li>
                ))}
              </Section>
            </div>
          )}

          {tab === 'reports' && (
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-white/45">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">الفصل</th>
                    <th className="px-4 py-3 text-right font-medium">المرحلة</th>
                    <th className="px-4 py-3 text-right font-medium">الحالة</th>
                    <th className="px-4 py-3 text-right font-medium">غائب</th>
                    <th className="px-4 py-3 text-right font-medium">المسجّل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.rows.map((c) => (
                    <tr key={`${c.grade}-${c.class_name}`} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white">
                        {c.grade} / {c.class_name}
                      </td>
                      <td className="px-4 py-3 text-white/50">{ACADEMIC_LEVEL_LABELS[c.level]}</td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            'text-xs font-bold',
                            c.done ? 'text-emerald-300' : 'text-amber-300',
                          )}
                        >
                          {c.done ? 'مكتمل' : 'متبقي'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {c.done ? c.session?.absent_count ?? 0 : '—'}
                      </td>
                      <td className="px-4 py-3 text-white/50">
                        {c.session?.recorder_name ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'ok' | 'warn' | 'danger';
}) {
  const color =
    tone === 'ok'
      ? 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10'
      : tone === 'warn'
        ? 'text-amber-300 border-amber-500/25 bg-amber-500/10'
        : tone === 'danger'
          ? 'text-red-300 border-red-500/25 bg-red-500/10'
          : 'text-white border-white/10 bg-white/[0.03]';
  return (
    <div className={clsx('rounded-2xl border p-4 text-center', color)}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-white/50 mt-1">{label}</p>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode[];
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-white/70 px-1">{title}</h3>
      {children.length === 0 ? (
        <p className="text-sm text-white/35 px-1 py-6">{empty}</p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </div>
  );
}
