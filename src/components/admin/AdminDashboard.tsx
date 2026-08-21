import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Award, Clock, Shield, Star, Trophy, CreditCard, BarChart3, PlusCircle, Zap,
  Lightbulb, CalendarCheck, QrCode, FileText, Monitor, Gift,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { containerVariants } from '../../lib/motionVariants';
import { buildWeeklyChallenge } from '../../lib/weeklyChallenge';
import { averagePerStudent } from '../../lib/classReport';
import { fetchApprovedClassGrants } from '../../lib/classPoints';
import { buildPendingInsights, buildVelocitySummary, buildAxisBreakdown } from '../../lib/pointsAnalytics';
import { fetchOperationalAlertData } from '../../lib/operationalAlerts';
import { PendingSummaryPanel } from './PendingSummaryPanel';
import { showSuccess, showError } from '../../lib/toast';
import { PLATFORM_NAME } from '../../lib/branding';
import { fetchWeeklyAssemblyData, printWeeklyAssemblyReport } from '../../lib/weeklyAssemblyReport';
import {
  GlassShell,
  GlassCard,
  GlassGreeting,
  GlassKpiCard,
  GlassAreaChartCard,
  GlassDonutCard,
  GlassQuickAction,
  GlassQuickGrid,
  GlassOpsList,
  type GlassOpsItem,
} from '../dashboard/glass';

const AXIS_LABELS: Record<string, string> = {
  activity: 'نشاط',
  behavior: 'سلوك',
  achievement: 'إنجاز',
  initiative: 'مبادرة',
};

export function AdminDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const firstName = (user?.full_name ?? '').trim().split(/\s+/)[0] || 'رائد النشاط';

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

  const { data: analytics } = useQuery({
    queryKey: ['admin', 'points-analytics'],
    queryFn: async () => {
      const { data: ledger, error } = await supabase
        .from('points_ledger')
        .select('points, status, created_at, activities(category)');
      if (error) throw error;
      const velocity = buildVelocitySummary(ledger ?? []);
      const axisBreakdown = buildAxisBreakdown(
        (ledger ?? []) as unknown as Array<{
          points: number;
          status: string;
          activities?: { category: string } | null;
        }>,
      );
      return { velocity, axisBreakdown };
    },
    refetchInterval: 60_000,
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
        classGrants,
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

  const areaData = useMemo(
    () =>
      (analytics?.velocity.thisWeek ?? []).map((d) => ({
        label: d.label,
        value: d.points,
      })),
    [analytics],
  );

  const donutData = useMemo(() => {
    const axis = analytics?.axisBreakdown;
    if (!axis) return [];
    return (Object.keys(AXIS_LABELS) as Array<keyof typeof AXIS_LABELS>).map((key) => ({
      name: AXIS_LABELS[key],
      value: axis[key as keyof typeof axis] ?? 0,
    })).filter((s) => s.value > 0);
  }, [analytics]);

  const sparkFromWeek = useMemo(
    () => (analytics?.velocity.thisWeek ?? []).map((d) => ({ v: d.points || 0 })),
    [analytics],
  );

  const quickLinks = [
    { label: 'مركز النقاط', to: '/admin/points', icon: Award, tint: 'orange' as const },
    { label: 'الحضور', to: '/admin/attendance', icon: CalendarCheck, tint: 'cyan' as const },
    { label: 'الاقتراحات', to: '/admin/suggestions', icon: Lightbulb, tint: 'orange' as const },
    { label: 'الأنشطة', to: '/admin/activities', icon: Star, tint: 'purple' as const },
    { label: 'المتصدرون', to: '/admin/leaderboard', icon: Trophy, tint: 'lime' as const },
    { label: 'التقارير', to: '/admin/reports-hub', icon: BarChart3, tint: 'pink' as const },
  ];

  const dailyOps = useMemo((): GlassOpsItem[] => {
    const items: GlassOpsItem[] = [];
    if (pendingCount > 0) {
      items.push({
        id: 'pending-points',
        title: `${pendingCount} طلب نقاط معلّق`,
        detail: 'يحتاج موافقة في مركز النقاط',
        to: '/admin/points',
        tone: 'warn',
      });
    }
    for (const a of operationalAlerts?.alerts?.slice(0, 5) ?? []) {
      items.push({
        id: a.id,
        title: a.title,
        detail: a.detail,
        to: a.actionPath,
        tone: a.severity === 'critical' || a.severity === 'warning' ? 'warn' : 'info',
      });
    }
    return items;
  }, [pendingCount, operationalAlerts]);

  const changePct = analytics?.velocity.changePct ?? null;

  return (
    <GlassShell>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-5 sm:space-y-6"
      >
        <GlassGreeting
          firstName={firstName}
          badge={PLATFORM_NAME}
          subtitle={`لوحة رائد النشاط — متابعة النقاط والحضور والأنشطة · ${PLATFORM_NAME}`}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <GlassKpiCard
            label="الطلاب المسجّلون"
            value={studentsCount}
            accent="cyan"
            spark={sparkFromWeek}
          />
          <GlassKpiCard
            label="المعلمون"
            value={teachersCount}
            accent="lime"
            spark={sparkFromWeek}
          />
          <GlassKpiCard
            label="طلبات معلّقة"
            value={pendingCount}
            accent="orange"
            trendPct={pendingCount > 0 ? null : 0}
            spark={sparkFromWeek}
          />
          <GlassKpiCard
            label="إجمالي الإدخالات"
            value={totalEntries}
            accent="purple"
            trendPct={changePct}
            trendLabel="مقارنة أسبوع النقاط"
            spark={sparkFromWeek}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="lg:col-span-3">
            <GlassAreaChartCard
              title="نظرة على النقاط"
              subtitle="النقاط المعتمدة خلال الأيام السبعة الأخيرة"
              data={areaData}
            />
          </div>
          <div className="lg:col-span-2">
            <GlassDonutCard
              title="التوزيع حسب المحور"
              subtitle="النقاط المعتمدة"
              data={donutData}
              centerLabel="الإجمالي"
              centerValue={analytics?.velocity.thisWeekTotal ?? 0}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4">
          <div className="xl:col-span-5 space-y-3 sm:space-y-4">
            <GlassOpsList title="مهام اليوم" items={dailyOps} />

            {pendingInsights && (
              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-[var(--glass-purple)]" />
                  <h3 className="text-sm font-bold text-[var(--glass-text)]">ملخص الموافقات</h3>
                </div>
                <PendingSummaryPanel
                  insights={pendingInsights}
                  onQuickApprove={() => quickApproveMutation.mutate()}
                  isApproving={quickApproveMutation.isPending}
                />
              </GlassCard>
            )}

            {weeklyChallenge?.winner && (
              <GlassCard>
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[var(--glass-orange)]" />
                    <h3 className="text-sm font-bold text-[var(--glass-text)]">
                      تحدي الأسبوع — {weeklyChallenge.axisLabel}
                    </h3>
                  </div>
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[rgba(245,158,11,0.12)] text-[#b45309] border border-[rgba(245,158,11,0.25)] hover:bg-[rgba(245,158,11,0.2)] transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    تقرير الطابور PDF
                  </button>
                </div>
                <p className="text-[var(--glass-muted)] text-sm">
                  الفصل الفائز:{' '}
                  <span className="text-[var(--glass-purple)] font-bold">{weeklyChallenge.winner.label}</span>
                  {' '}({averagePerStudent(weeklyChallenge.winner, 'initiative')} نقطة مبادرة ⌀)
                </p>
              </GlassCard>
            )}
          </div>

          <div className="xl:col-span-3">
            <GlassCard className="h-full">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-[var(--glass-purple)]" />
                <h3 className="text-sm font-bold text-[var(--glass-text)]">أبرز الروابط</h3>
              </div>
              <ul className="space-y-2">
                {[
                  { to: '/admin/add-points', label: 'نقاط يدوية', icon: PlusCircle },
                  { to: '/admin/event-checkin', label: 'حضور فعالية', icon: QrCode },
                  { to: '/admin/id-cards', label: 'بطاقات التعريف', icon: CreditCard },
                  { to: '/admin/rewards', label: 'متجر المكافآت', icon: Gift },
                  { to: '/display/leaderboard', label: 'شاشة المتصدرين', icon: Monitor },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <li key={row.to}>
                      <Link to={row.to} className="glass-ops-row !no-underline">
                        <span className="w-9 h-9 rounded-xl glass-icon-tint flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="text-sm font-semibold text-[var(--glass-text)] flex-1">{row.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          </div>

          <div className="xl:col-span-4">
            <GlassCard className="h-full">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-[var(--glass-purple)]" />
                <h3 className="text-sm font-bold text-[var(--glass-text)]">إجراءات سريعة</h3>
              </div>
              <GlassQuickGrid>
                {quickLinks.map((link) => (
                  <GlassQuickAction
                    key={link.to}
                    to={link.to}
                    label={link.label}
                    icon={link.icon}
                    tint={link.tint}
                  />
                ))}
              </GlassQuickGrid>
            </GlassCard>
          </div>
        </div>
      </motion.div>
    </GlassShell>
  );
}
