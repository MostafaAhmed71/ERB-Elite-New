import { useMemo, useState } from 'react';
import { CalendarCheck, AlertCircle, Calendar } from 'lucide-react';
import { useParentChildren } from '../../hooks/useParentChildren';
import { ParentPageShell } from '../../components/parent/ParentPageShell';
import { AttendanceMonthlyChart } from '../../components/parent/AttendanceMonthlyChart';
import { useQuery } from '@tanstack/react-query';
import type { AttendanceStatus } from '../../types';
import { ATTENDANCE_LABELS, ATTENDANCE_COLORS } from '../../types';
import { fetchStudentClassAttendanceCalendar, type ClassDayAttendance } from '../../lib/attendanceQueries';
import clsx from 'clsx';
import { BarsLoader } from '../../components/ui/BarsLoader';

function formatAttendanceDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function sourceLabel(row: ClassDayAttendance): string {
  if (!row.isRecorded) return 'يوم سُجّل فيه الفصل ولم يُرصد حضور الابن';
  if (row.note?.startsWith('نمط ')) return `تجريبي — ${row.note}`;
  if (row.note) return row.note;
  return 'مسجّل في النظام';
}

type ListFilter = 'absent' | 'late' | 'all';

export function ParentAttendancePage() {
  const { children, isLoading: childrenLoading, selectedChild, selectedChildId } = useParentChildren();
  const [listFilter, setListFilter] = useState<ListFilter>('absent');

  const { data: attendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['parent', 'attendance', selectedChildId, 'class-calendar'],
    queryFn: () => fetchStudentClassAttendanceCalendar(selectedChildId),
    enabled: !!selectedChildId,
  });

  const attendanceSummary = {
    present: attendance.filter((a) => a.status === 'present').length,
    absent: attendance.filter((a) => a.status === 'absent').length,
    late: attendance.filter((a) => a.status === 'late').length,
  };

  const visibleRows = useMemo(() => {
    if (listFilter === 'all') return attendance;
    return attendance.filter((a) => a.status === listFilter);
  }, [attendance, listFilter]);

  const isLoading = childrenLoading || attendanceLoading;

  if (isLoading && children.length === 0) {
    return <BarsLoader label="جاري تحميل الحضور..." fullScreen />;
  }

  if (children.length === 0) {
    return (
      <ParentPageShell showChildBar={false}>
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-6 glass-card">
          <AlertCircle className="w-12 h-12 text-gold-400 mb-3" />
          <h2 className="text-white font-bold text-lg">لا يوجد أبناء مرتبطين بحسابك</h2>
          <p className="text-white/40 text-sm mt-1">يرجى مراجعة إدارة المدرسة لربط بيانات الأبناء بحساب ولي الأمر.</p>
        </div>
      </ParentPageShell>
    );
  }

  return (
    <ParentPageShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-gold-400" />
            متابعة حضور وغياب الابن
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {selectedChild
              ? `${selectedChild.full_name} · ${selectedChild.grade} — ${selectedChild.class_name}`
              : 'تفاصيل وتواريخ حضور وغياب الأبناء اليومية'}
          </p>
        </div>

        {selectedChild && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card p-4 text-center border-emerald-500/20">
                <p className="text-2xl font-bold text-emerald-400">{attendanceSummary.present}</p>
                <p className="text-xs text-white/50 mt-1">أيام الحضور</p>
              </div>
              <div className="glass-card p-4 text-center border-amber-500/20">
                <p className="text-2xl font-bold text-amber-400">{attendanceSummary.late}</p>
                <p className="text-xs text-white/50 mt-1">أيام التأخير</p>
              </div>
              <div className="glass-card p-4 text-center border-red-500/20">
                <p className="text-2xl font-bold text-red-400">{attendanceSummary.absent}</p>
                <p className="text-xs text-white/50 mt-1">أيام الغياب</p>
              </div>
            </div>

            <AttendanceMonthlyChart records={attendance} />

            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-white font-semibold text-sm">سجل الغياب</h2>
                <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                  {([
                    { id: 'absent' as const, label: `الغياب (${attendanceSummary.absent})` },
                    { id: 'late' as const, label: `التأخير (${attendanceSummary.late})` },
                    { id: 'all' as const, label: `كل الأيام (${attendance.length})` },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setListFilter(tab.id)}
                      className={clsx(
                        'px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors',
                        listFilter === tab.id ? 'bg-gold-500/20 text-gold-300' : 'text-white/45 hover:text-white',
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 border-b border-white/5 text-white/40 font-medium">
                    <tr>
                      <th className="px-5 py-3 text-right">التاريخ</th>
                      <th className="px-5 py-3 text-right">حالة الحضور</th>
                      <th className="px-5 py-3 text-right">المصدر</th>
                      <th className="px-5 py-3 text-right">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/70">
                    {attendance.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-white/30">لا توجد سجلات حضور مسجلة للابن بعد</td>
                      </tr>
                    ) : visibleRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-white/30">
                          {listFilter === 'absent'
                            ? 'لا يوجد غياب في أيام تسجيل الفصل'
                            : listFilter === 'late'
                              ? 'لا يوجد تأخير مسجّل لهذا الابن'
                              : 'لا توجد سجلات'}
                        </td>
                      </tr>
                    ) : (
                      visibleRows.map((record) => (
                        <tr key={record.date} className="hover:bg-white/3 transition-colors">
                          <td className="px-5 py-3.5 font-medium">
                            <span className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-white/20" />
                              <span>
                                {formatAttendanceDate(record.date)}
                                <span className="block text-[10px] text-white/30 font-mono mt-0.5">{record.date}</span>
                              </span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={clsx('px-2.5 py-1 rounded-full text-xs border font-medium', ATTENDANCE_COLORS[record.status])}>
                              {ATTENDANCE_LABELS[record.status]}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-white/60">{sourceLabel(record)}</td>
                          <td className="px-5 py-3.5 text-xs text-white/50 italic">{record.note ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </ParentPageShell>
  );
}
