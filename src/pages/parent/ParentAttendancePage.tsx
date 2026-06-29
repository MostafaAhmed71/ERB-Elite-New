import { CalendarCheck, AlertCircle, Calendar } from 'lucide-react';
import { useParentChildren } from '../../hooks/useParentChildren';
import { ParentPageShell } from '../../components/parent/ParentPageShell';
import { ParentChildSelector } from '../../components/parent/ParentChildSelector';
import { AttendanceMonthlyChart } from '../../components/parent/AttendanceMonthlyChart';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { AttendanceStatus } from '../../types';
import { ATTENDANCE_LABELS, ATTENDANCE_COLORS } from '../../types';
import clsx from 'clsx';
import { BarsLoader } from '../../components/ui/BarsLoader';

export function ParentAttendancePage() {
  const { children, isLoading: childrenLoading, selectedChild, selectedChildId, setSelectedChildId } = useParentChildren();

  const { data: attendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['parent', 'attendance', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', selectedChildId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedChildId,
  });

  const attendanceSummary = {
    present: attendance.filter((a) => a.status === 'present').length,
    absent: attendance.filter((a) => a.status === 'absent').length,
    late: attendance.filter((a) => a.status === 'late').length,
  };

  const isLoading = childrenLoading || attendanceLoading;

  if (isLoading && children.length === 0) {
    return <BarsLoader label="جاري تحميل الحضور..." fullScreen />;
  }

  if (children.length === 0) {
    return (
      <ParentPageShell>
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
          <p className="text-white/40 text-sm mt-1">تفاصيل وتواريخ حضور وغياب الأبناء اليومية</p>
        </div>

        <ParentChildSelector
          children={children}
          selectedChildId={selectedChildId}
          onChange={setSelectedChildId}
        />

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
              <div className="p-4 border-b border-white/5">
                <h2 className="text-white font-semibold text-sm">سجل التواريخ التفصيلي</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 border-b border-white/5 text-white/40 font-medium">
                    <tr>
                      <th className="px-5 py-3 text-right">التاريخ</th>
                      <th className="px-5 py-3 text-right">حالة الحضور</th>
                      <th className="px-5 py-3 text-right">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/70">
                    {attendance.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-white/30">لا توجد سجلات حضور مسجلة للابن بعد</td>
                      </tr>
                    ) : (
                      attendance.map((record) => (
                        <tr key={record.id} className="hover:bg-white/3 transition-colors">
                          <td className="px-5 py-3.5 font-medium">
                            <span className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-white/20" />
                              {new Date(record.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={clsx('px-2.5 py-1 rounded-full text-xs border font-medium', ATTENDANCE_COLORS[record.status as AttendanceStatus])}>
                              {ATTENDANCE_LABELS[record.status as AttendanceStatus]}
                            </span>
                          </td>
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
