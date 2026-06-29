import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOperationalAlertData } from '../../lib/operationalAlerts';
import { OperationalAlertCenter } from '../../components/shared/OperationalAlertCenter';
import {
  Users,
  BookOpen,
  CalendarCheck,
  TrendingUp,
  ClipboardList,
  BarChart3,
  Settings,
  UserPlus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { ROLE_LABELS } from '../../types';
import { containerVariants } from '../../lib/motionVariants';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { SetupChecklist } from '../../components/onboarding/SetupChecklist';
import { isChecklistDismissed, dismissChecklist } from '../../lib/onboarding';
import { PLATFORM_NAME } from '../../lib/branding';
import {
  HorizonCard,
  HorizonStatCard,
  HorizonWelcomeCard,
  HorizonActionCard,
} from '../../components/dashboard/horizon/HorizonDashboard';

const QUICK_ACTIONS = [
  {
    to: '/principal/executive',
    label: 'لوحة التنفيذية',
    description: 'مؤشرات الطلاب والاختبارات',
    icon: TrendingUp,
    accent: 'purple' as const,
  },
  {
    to: '/principal/users',
    label: 'إدارة المستخدمين',
    description: 'الطلاب والموظفين والأولياء',
    icon: Users,
    accent: 'blue' as const,
  },
  {
    to: '/principal/bulk-accounts',
    label: 'توليد حسابات الفصل',
    description: 'إنشاء حسابات الطلاب وأولياء الأمور',
    icon: UserPlus,
    accent: 'purple' as const,
  },
  {
    to: '/principal/bulk-upload',
    label: 'الرفع الجماعي',
    description: 'استيراد بيانات الطلاب',
    icon: BookOpen,
    accent: 'gold' as const,
  },
  {
    to: '/exams',
    label: 'إدارة الاختبارات',
    description: 'الاختبارات والنتائج',
    icon: ClipboardList,
    accent: 'blue' as const,
  },
  {
    to: '/principal/reports',
    label: 'التقارير',
    description: 'تقارير الأداء المدرسي',
    icon: BarChart3,
    accent: 'purple' as const,
  },
  {
    to: '/analytics',
    label: 'التحليلات',
    description: 'تحليلات متقدمة',
    icon: TrendingUp,
    accent: 'gold' as const,
  },
  {
    to: '/principal/settings',
    label: 'الصفوف والفصول',
    description: 'الهيكل المدرسي وتقييم الطلاب',
    icon: Settings,
    accent: 'gold' as const,
  },
];

export function PrincipalDashboard() {
  const { user, role } = useAuthStore();
  const [checklistHidden, setChecklistHidden] = useState(isChecklistDismissed());

  const { data: alertData } = useQuery({
    queryKey: ['operational-alerts'],
    queryFn: fetchOperationalAlertData,
    refetchInterval: 60_000,
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      const [studentsRes, attendanceRes, examsRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('status'),
        supabase.from('exams').select('*', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      const attendanceRows = (attendanceRes.data ?? []) as { status: string }[];
      const presentCount = attendanceRows.filter((a) => a.status === 'present').length;
      const attendancePct =
        attendanceRows.length > 0 ? Math.round((presentCount / attendanceRows.length) * 100) : null;

      return {
        students: studentsRes.count ?? 0,
        attendancePct,
        activeExams: examsRes.count ?? 0,
      };
    },
  });

  const statCards = [
    {
      label: 'إجمالي الطلاب',
      value: isLoading ? '—' : String(stats?.students ?? 0),
      icon: Users,
      iconVariant: 'gradient' as const,
    },
    {
      label: 'نسبة الحضور',
      value: isLoading ? '—' : stats?.attendancePct != null ? `${stats.attendancePct}%` : '—',
      icon: CalendarCheck,
      iconVariant: 'soft' as const,
    },
    {
      label: 'الاختبارات النشطة',
      value: isLoading ? '—' : String(stats?.activeExams ?? 0),
      icon: ClipboardList,
      iconVariant: 'blue' as const,
    },
  ];

  return (
    <div className="horizon-dashboard relative min-h-full" dir="rtl">
      {/* خلفية Horizon: navy.900 مع توهج ناعم */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-[24px]"
        style={{
          background:
            'radial-gradient(circle at 85% 0%, rgba(117,81,255,0.12) 0%, transparent 42%), radial-gradient(circle at 10% 20%, rgba(68,129,235,0.08) 0%, transparent 38%), linear-gradient(180deg, rgba(17,28,68,0.35) 0%, transparent 100%)',
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        <HorizonWelcomeCard
          title={user?.full_name ?? 'مدير المدرسة'}
          subtitle={`مرحباً بك في ${PLATFORM_NAME}`}
          role={role ? ROLE_LABELS[role] : undefined}
          avatar={user?.full_name?.charAt(0) ?? 'م'}
        />

        {!checklistHidden && (
          <SetupChecklist
            onDismiss={() => {
              dismissChecklist();
              setChecklistHidden(true);
            }}
          />
        )}

        {alertData && (
          <OperationalAlertCenter
            alerts={alertData.alerts}
            title="مركز التنبيهات الإداري"
            subtitle="فصول بلا نشاط · معلمون خامدون · طلبات معلّقة تحتاج متابعة"
          />
        )}

        {isLoading ? (
          <HorizonCard className="py-12 flex justify-center">
            <TapHandLoader label="جاري تحميل الإحصائيات..." />
          </HorizonCard>
        ) : (
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            {statCards.map((card, i) => (
              <HorizonStatCard key={card.label} {...card} index={i} />
            ))}
          </motion.div>
        )}

        <HorizonCard>
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-white">الإجراءات السريعة</h2>
              <p className="text-sm font-medium text-[#A3AED0] mt-1">اختصارات لأهم مهام إدارة المدرسة</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/[0.06] text-[#A3AED0]">
              {QUICK_ACTIONS.length} إجراءات
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {QUICK_ACTIONS.map((action) => (
              <HorizonActionCard key={action.to} {...action} />
            ))}
          </div>
        </HorizonCard>
      </motion.div>
    </div>
  );
}
