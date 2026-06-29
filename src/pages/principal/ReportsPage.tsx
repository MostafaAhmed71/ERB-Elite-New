import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, CalendarCheck, ClipboardList } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { HorizonStatCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { StudentsGradeDistribution } from '../../components/dashboard/horizon/StudentsGradeDistribution';
import { AttendanceTrendChart } from '../../components/dashboard/horizon/AttendanceTrendChart';

export function ReportsPage() {
  const { data: studentsStats } = useQuery({
    queryKey: ['reports', 'students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('grade, class_name');
      if (error) throw error;

      const gradesMap: Record<string, number> = {};
      data.forEach((s) => {
        gradesMap[s.grade] = (gradesMap[s.grade] || 0) + 1;
      });

      return {
        total: data.length,
        grades: Object.entries(gradesMap).map(([name, count]) => ({ name, count })),
      };
    },
  });

  const { data: examStats } = useQuery({
    queryKey: ['reports', 'exams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exam_results').select('score, max_score');
      if (error) throw error;
      const total = data.length;
      const passCount = data.filter((r) => r.max_score > 0 && r.score / r.max_score >= 0.5).length;
      return {
        total,
        passRate: total > 0 ? `${Math.round((passCount / total) * 100)}%` : '—',
      };
    },
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ['reports', 'attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('status, date');
      if (error) throw error;

      const total = data.length;
      if (total === 0) return { rate: '—', history: [] as { date: string; rate: number }[] };

      const presentCount = data.filter((d) => d.status === 'present').length;
      const lateCount = data.filter((d) => d.status === 'late').length;
      const rate = (((presentCount + lateCount * 0.7) / total) * 100).toFixed(1);

      const dailyGroup: Record<string, { present: number; total: number }> = {};
      data.forEach((item) => {
        if (!dailyGroup[item.date]) {
          dailyGroup[item.date] = { present: 0, total: 0 };
        }
        dailyGroup[item.date].total += 1;
        if (item.status === 'present' || item.status === 'late') {
          dailyGroup[item.date].present += item.status === 'present' ? 1 : 0.7;
        }
      });

      const history = Object.entries(dailyGroup)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([date, stats]) => ({
          date,
          rate: Math.round((stats.present / stats.total) * 100),
        }));

      return {
        rate: `${rate}%`,
        history,
      };
    },
  });

  return (
    <div className="horizon-dashboard space-y-5 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#f0b429]" />
          التقارير والإحصائيات
        </h1>
        <p className="text-[#A3AED0] text-sm mt-1">
          عرض تحليلي للطلاب والاختبارات — النقاط من اختصاص رائد النشاط
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <HorizonStatCard
          label="إجمالي الطلاب المسجلين"
          value={studentsStats?.total ?? '—'}
          icon={Users}
          iconVariant="blue"
        />
        <HorizonStatCard
          label="معدل نجاح الاختبارات"
          value={examStats?.passRate ?? '—'}
          icon={ClipboardList}
          iconVariant="gradient"
        />
        <HorizonStatCard
          label="متوسط نسبة الحضور"
          value={attendanceStats?.rate ?? '—'}
          icon={CalendarCheck}
          iconVariant="soft"
        />
      </div>

      <StudentsGradeDistribution data={studentsStats?.grades ?? []} />

      <AttendanceTrendChart
        data={attendanceStats?.history ?? []}
        averageRate={attendanceStats?.rate}
      />
    </div>
  );
}
