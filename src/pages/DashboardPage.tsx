import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { ROLE_LABELS } from '../types';
import { Users, Award, CalendarCheck, TrendingUp, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { containerVariants } from '../lib/motionVariants';
import { PageHeader, Panel, StatCard, QuickLink, SectionTitle, TapHandLoader } from '../components/ui';
import { PrincipalDashboard } from './principal/PrincipalDashboard';
import { SupervisorDashboard } from './supervisor/SupervisorDashboard';
import { TeacherDashboard } from './teacher/TeacherDashboard';
import { ParentDashboard } from '../components/parent/ParentDashboard';
import { PLATFORM_NAME } from '../lib/branding';

export function DashboardPage() {
  const { user, role } = useAuthStore();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      const [studentsRes, pointsRes, attendanceRes, examsRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('points_ledger').select('points').eq('status', 'approved'),
        supabase.from('attendance').select('status'),
        supabase.from('exams').select('*', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      const totalPoints = (pointsRes.data ?? []).reduce(
        (sum, row) => sum + Number((row as { points: number }).points),
        0
      );

      const attendanceRows = (attendanceRes.data ?? []) as { status: string }[];
      const presentCount = attendanceRows.filter((a) => a.status === 'present').length;
      const attendancePct =
        attendanceRows.length > 0 ? Math.round((presentCount / attendanceRows.length) * 100) : null;

      return {
        students: studentsRes.count ?? 0,
        points: totalPoints,
        attendancePct,
        activeExams: examsRes.count ?? 0,
      };
    },
  });

  const defaultStatCards = [
    {
      icon: Users,
      label: 'إجمالي الطلاب',
      value: isLoading ? '—' : String(stats?.students ?? 0),
      color: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    ...(role !== 'principal'
      ? [
          {
            icon: Award,
            label: 'النقاط الممنوحة',
            value: isLoading ? '—' : String(stats?.points ?? 0),
            color: 'from-gold-400 to-gold-500',
            bg: 'bg-gold-500/10 border-gold-500/20',
          },
        ]
      : []),
    {
      icon: CalendarCheck,
      label: 'نسبة الحضور',
      value: isLoading ? '—' : stats?.attendancePct != null ? `${stats.attendancePct}%` : '—',
      color: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      icon: ClipboardList,
      label: 'الاختبارات النشطة',
      value: isLoading ? '—' : String(stats?.activeExams ?? 0),
      color: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
  ];

  useEffect(() => {
    if (role === 'admin' || role === 'activity_leader') {
      navigate('/admin', { replace: true });
    } else if (role === 'student') {
      navigate('/student', { replace: true });
    }
  }, [role, navigate]);

  if (role === 'principal') {
    return <PrincipalDashboard />;
  }

  if (role === 'supervisor') {
    return <SupervisorDashboard />;
  }

  if (role === 'teacher') {
    return <TeacherDashboard />;
  }

  if (role === 'parent') {
    return <ParentDashboard />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
      dir="rtl"
    >
      <PageHeader
        title={user?.full_name ?? 'مستخدم'}
        subtitle={`مرحباً بك في ${PLATFORM_NAME}`}
        role={role ? ROLE_LABELS[role] : undefined}
        avatar={user?.full_name?.charAt(0) ?? 'م'}
      />

      {isLoading ? (
        <TapHandLoader label="جاري تحميل الإحصائيات..." fullScreen />
      ) : (
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {defaultStatCards.map((card, i) => (
            <StatCard key={card.label} {...card} index={i} />
          ))}
        </motion.div>
      )}

      <Panel className="p-6">
        <SectionTitle icon={TrendingUp}>الإجراءات السريعة</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {role === 'activity_leader' && (
            <QuickLink icon={Users} label="منح النقاط" to="/points/grant" />
          )}
        </div>
      </Panel>
    </motion.div>
  );
}
