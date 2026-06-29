import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Award, Clock, Shield, Star, Trophy, CreditCard, BarChart3, PlusCircle, Zap, Lightbulb, UserPlus, CalendarCheck, QrCode, FileText, Monitor, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { containerVariants } from '../../lib/motionVariants';
import { PageHeader } from '../ui/PageHeader';
import { StatCard, ActionCard, SectionTitle, Panel } from '../ui/Card';
import { buildWeeklyChallenge } from '../../lib/weeklyChallenge';
import { averagePerStudent } from '../../lib/classReport';
import { fetchApprovedClassGrants } from '../../lib/classPoints';
import { buildPendingInsights } from '../../lib/pointsAnalytics';
import { fetchOperationalAlertData } from '../../lib/operationalAlerts';
import { PendingSummaryPanel } from './PendingSummaryPanel';
import { OperationalAlertCenter } from '../shared/OperationalAlertCenter';
import { PointsAnalyticsPanel } from './PointsAnalyticsPanel';
import { showSuccess, showError } from '../../lib/toast';
import { PLATFORM_NAME } from '../../lib/branding';
import { fetchWeeklyAssemblyData, printWeeklyAssemblyReport } from '../../lib/weeklyAssemblyReport';

export function AdminDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: studentsCount = 0 } = useQuery({
    queryKey: ['admin', 'stats', 'students'],
    queryFn: async () => {
      const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: teachersCount = 0 } = useQuery({
    queryKey: ['admin', 'stats', 'teachers'],
    queryFn: async () => {
      const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['admin', 'stats', 'pending'],
    queryFn: async () => {
      const { count, error } = await supabase.from('points_ledger').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: totalEntries = 0 } = useQuery({
    queryKey: ['admin', 'stats', 'total'],
    queryFn: async () => {
      const { count, error } = await supabase.from('points_ledger').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: operationalAlerts } = useQuery({
    queryKey: ['operational-alerts'],
    queryFn: fetchOperationalAlertData,
    refetchInterval: 60_000,
  });

  const { data: pendingInsights } = useQuery({
    queryKey: ['admin', 'pending-insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select('points, status, created_at, granted_by_user:granted_by(full_name)');
      if (error) throw error;
      return buildPendingInsights((data ?? []) as unknown as Parameters<typeof buildPendingInsights>[0]);
    },
    refetchInterval: 30_000,
  });

  const { data: weeklyChallenge } = useQuery({
    queryKey: ['admin', 'weekly-challenge'],
    queryFn: async () => {
      const [ledgerRes, classGrants] = await Promise.all([
        supabase
          .from('points_ledger')
          .select('student_id, points, status, activity_id, created_at, activities(category), students(grade, class_name)')
          .eq('status', 'approved'),
        fetchApprovedClassGrants(),
      ]);
      const { data, error } = ledgerRes;
      if (error) throw error;
      return buildWeeklyChallenge(
        (data ?? []) as unknown as Parameters<typeof buildWeeklyChallenge>[0],
        'initiative',
        classGrants
      );
    },
  });

  const quickApproveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('غير مصرح');
      const { data: pending, error: fetchErr } = await supabase
        .from('points_ledger')
        .select('id')
        .eq('status', 'pending');
      if (fetchErr) throw fetchErr;
      if (!pending?.length) return;

      const { error } = await supabase
        .from('points_ledger')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .in('id', pending.map((p) => p.id));
      if (error) throw error;
      return pending.length;
    },
    onSuccess: (count) => {
      showSuccess(`تمت الموافقة على ${count ?? 0} طلب`);
      queryClient.invalidateQueries({ queryKey: ['points_ledger'] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e: Error) => showError(e),
  });

  const stats = [
    { label: 'الطلاب المسجّلون', value: studentsCount, icon: Users, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'المعلمون', value: teachersCount, icon: Shield, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'طلبات معلقة', value: pendingCount, icon: Clock, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'إجمالي الإدخالات', value: totalEntries, icon: Award, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-500/10 border-purple-500/20' },
  ];

  const quickLinks = [
    { label: 'مركز النقاط', to: '/admin/points', desc: 'منح، موافقة، وسجل العمليات', icon: Award, iconColor: 'text-gold-400' },
    { label: 'الحضور والغياب', to: '/admin/attendance', desc: 'رفع ملف أسبوعي/شهري وتقارير الحضور', icon: CalendarCheck, iconColor: 'text-cyan-400' },
    { label: 'اقتراحات الطلاب', to: '/admin/suggestions', desc: 'مراجعة اقتراحات الأنشطة وتحويلها', icon: Lightbulb, iconColor: 'text-amber-400' },
    { label: 'إدارة الأنشطة', to: '/admin/activities', desc: 'تعديل محاور وكتالوج الأنشطة', icon: Star, iconColor: 'text-blue-400' },
    { label: 'لوحة المتصدرين', to: '/admin/leaderboard', desc: 'ترتيب الفصول والطلاب الأكثر تميزاً', icon: Trophy, iconColor: 'text-amber-400' },
    { label: 'شاشة كبيرة G2', to: '/board/leaderboard', desc: 'عرض الطابور والمتصدرين على شاشة كبيرة', icon: Monitor, iconColor: 'text-cyan-400' },
    { label: 'بطاقات التعريف', to: '/admin/id-cards', desc: 'طباعة بطاقات QR للطلاب', icon: CreditCard, iconColor: 'text-emerald-400' },
    { label: 'حضور الفعاليات', to: '/admin/event-checkin', desc: 'مسح QR في الفعالية → نقاط تلقائية', icon: QrCode, iconColor: 'text-emerald-400' },
    { label: 'متجر المكافآت', to: '/admin/rewards', desc: 'تفعيل المتجر واعتماد طلبات الاستبدال', icon: Gift, iconColor: 'text-purple-400' },
    { label: 'إضافة نقاط يدوية', to: '/admin/add-points', desc: 'رصد نقاط مباشرة مع اعتماد فوري', icon: PlusCircle, iconColor: 'text-pink-400' },
    { label: 'التقارير', to: '/admin/reports', desc: 'تصدير تقارير الأداء الشاملة', icon: BarChart3, iconColor: 'text-purple-400' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
      dir="rtl"
    >
      <PageHeader
        title="لوحة رائد النشاط"
        subtitle={`المحطة الرئيسية لمتابعة وإدارة ${PLATFORM_NAME}`}
        icon={Shield}
        badge={PLATFORM_NAME}
        guidePath="/admin"
      />

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((card, i) => (
          <StatCard key={card.label} {...card} value={card.value} index={i} />
        ))}
      </motion.div>

      {operationalAlerts && operationalAlerts.alerts.length > 0 && (
        <OperationalAlertCenter
          alerts={operationalAlerts.alerts}
          title="تنبيهات تشغيلية"
          subtitle="فصول بلا نقاط · معلمون بلا منح · طلبات معلّقة"
        />
      )}

      {pendingInsights && (
        <Panel className="p-5">
          <SectionTitle icon={Clock} className="mb-4">ملخص الموافقات</SectionTitle>
          <PendingSummaryPanel
            insights={pendingInsights}
            onQuickApprove={() => quickApproveMutation.mutate()}
            isApproving={quickApproveMutation.isPending}
          />
        </Panel>
      )}

      <PointsAnalyticsPanel />

      {weeklyChallenge?.winner && (
        <Panel className="p-5 border-amber-500/20 bg-gradient-to-l from-amber-900/20 to-transparent">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
            <SectionTitle icon={Zap} className="mb-0">تحدي الأسبوع — {weeklyChallenge.axisLabel}</SectionTitle>
            <button
              type="button"
              onClick={async () => {
                try {
                  const data = await fetchWeeklyAssemblyData();
                  printWeeklyAssemblyReport(data);
                } catch (e) {
                  showError(e instanceof Error ? e : new Error('تعذّر إنشاء التقرير'));
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-amber-500/25 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              تقرير الطابور PDF
            </button>
          </div>
          <p className="text-white/60 text-sm">
            الفصل الفائز: <span className="text-gold-400 font-bold">{weeklyChallenge.winner.label}</span>
            {' '}({averagePerStudent(weeklyChallenge.winner, 'initiative')} نقطة مبادرة ⌀)
          </p>
        </Panel>
      )}

      <div>
        <SectionTitle icon={Star}>أدوات الإدارة السريعة</SectionTitle>
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4"
        >
          {quickLinks.map((link) => (
            <ActionCard
              key={link.to}
              to={link.to}
              label={link.label}
              description={link.desc}
              icon={link.icon}
              iconColor={link.iconColor}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
