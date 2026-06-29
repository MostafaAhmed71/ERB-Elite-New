import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, Upload, Search, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAction } from '../../lib/auth';
import { useAuthStore } from '../../stores/authStore';
import { mergeGradeLists } from '../../lib/schoolClasses';
import { useGradeClassCatalog } from '../../hooks/useGradeClassCatalog';
import type { DbStudent, AttendanceStatus } from '../../types';
import { ATTENDANCE_LABELS, ATTENDANCE_COLORS } from '../../types';
import { toast } from 'react-hot-toast';
import { BarsLoader } from '../../components/ui/BarsLoader';
import { invalidateAttendanceQueries } from '../../lib/attendanceQueries';
import clsx from 'clsx';

type AttendanceMap = Record<string, AttendanceStatus>;

export function AttendancePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [gradeFilter, setGradeFilter] = useState('');
  const { data: catalog } = useGradeClassCatalog();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').eq('is_active', true).order('full_name');
      if (error) throw error;
      // Initialize all as present
      const map: AttendanceMap = {};
      (data as DbStudent[]).forEach(s => { map[s.id] = 'present'; });
      setAttendance(map);
      return data as DbStudent[];
    },
  });

  // Fetch existing attendance for selected date
  const { data: existingAttendance } = useQuery({
    queryKey: ['attendance', date],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance').select('student_id, status').eq('date', date);
      if (error) throw error;
      const map: AttendanceMap = {};
      (data ?? []).forEach((r: any) => { map[r.student_id] = r.status as AttendanceStatus; });
      setAttendance(prev => ({ ...prev, ...map }));
      return data;
    },
    enabled: !!date,
  });

  const grades = useMemo(
    () => mergeGradeLists(catalog?.grades, students.map((s) => s.grade)),
    [catalog?.grades, students]
  );

  const filtered = students.filter(s =>
    (gradeFilter === '' || s.grade === gradeFilter) &&
    (s.full_name.toLowerCase().includes(search.toLowerCase()) || s.admission_number.includes(search))
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('غير مصرح');
      const inserts = Object.entries(attendance).map(([student_id, status]) => ({
        student_id,
        date,
        status,
        recorded_by: user.id,
      }));

      // Upsert attendance
      const { error } = await supabase.from('attendance').upsert(inserts, { onConflict: 'student_id,date' });
      if (error) throw error;
      await logAction('ATTENDANCE_RECORDED', 'attendance', undefined, { date, count: inserts.length });
    },
    onSuccess: () => {
      toast.success('تم حفظ الحضور بنجاح');
      invalidateAttendanceQueries(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'absent', 'late'];

  const counts = {
    present: Object.values(attendance).filter(v => v === 'present').length,
    absent: Object.values(attendance).filter(v => v === 'absent').length,
    late: Object.values(attendance).filter(v => v === 'late').length,
  };

  if (isLoading) {
    return <BarsLoader label="جاري تحميل قائمة الطلاب..." fullScreen />;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-gold-400" /> تسجيل الحضور
          </h1>
        </div>
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 rounded-xl font-semibold text-sm disabled:opacity-50">
          <Check className="w-4 h-4" />
          {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الحضور'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(counts) as AttendanceStatus[]).map(status => (
          <div key={status} className={clsx('rounded-2xl border p-4 text-center', ATTENDANCE_COLORS[status].replace('text-', 'border-').split(' ')[1], 'bg-opacity-10')}>
            <p className="text-2xl font-bold text-white">{counts[status]}</p>
            <p className="text-sm text-white/50 mt-1">{ATTENDANCE_LABELS[status]}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold-400/50 text-sm" />
        <div className="relative flex-1 min-w-48">
          <Search className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pr-10 py-2 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/40 text-sm" />
        </div>
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none">
          <option value="" className="bg-navy-900">كل الصفوف</option>
          {grades.map(g => <option key={g} value={g} className="bg-navy-900">{g}</option>)}
        </select>
      </div>

      {/* Attendance Table */}
      <div className="bg-navy-900/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-5 py-3 text-right text-white/40 font-medium">الطالب</th>
                <th className="px-5 py-3 text-right text-white/40 font-medium">الصف / الفصل</th>
                <th className="px-5 py-3 text-right text-white/40 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(student => (
                <tr key={student.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {student.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium">{student.full_name}</p>
                        <p className="text-white/30 text-xs">{student.admission_number}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-white/50 text-xs">{student.grade} — {student.class_name}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {STATUS_OPTIONS.map(status => (
                        <button key={status} onClick={() => setAttendance(prev => ({ ...prev, [student.id]: status }))}
                          className={clsx('px-3 py-1.5 rounded-lg text-xs border transition-all',
                            attendance[student.id] === status
                              ? ATTENDANCE_COLORS[status]
                              : 'border-white/10 text-white/30 hover:text-white/60'
                          )}>
                          {ATTENDANCE_LABELS[status]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
