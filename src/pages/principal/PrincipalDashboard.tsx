import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOperationalAlertData } from '../../lib/operationalAlerts';
import {
  Users,
  BookOpen,
  CalendarCheck,
  TrendingUp,
  ClipboardList,
  BarChart3,
  Settings,
  UserPlus,
  FileText,
  AlertTriangle,
  Building2,
  ScrollText,
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
import { fetchAcademicSnapshot } from '../../lib/unifiedDashboard';
import { TeacherModeToggle } from '../../components/teacher/TeacherModeToggle';
import { useTeacherModeStore } from '../../stores/teacherModeStore';
import { TEACHER_MODE_LABELS, isAcademicNavPath, isOlympiadNavPath } from '../../lib/teacherMode';
import { ModeWorkspaceBanner } from '../../components/teacher/ModeWorkspaceBanner';
import {
  GlassShell,
  GlassCard,
  GlassGreeting,
  GlassKpiCard,
  GlassQuickAction,
  GlassQuickGrid,
  GlassAreaChartCard,
  GlassDonutCard,
  GlassOpsList,
  type GlassOpsItem,
} from '../../components/dashboard/glass';

const OLYMPIAD_SCHOOL_OPS = [
  {
    to: '/principal/executive',
    label: 'التنفيذية',
    icon: TrendingUp,
    tint: 'purple' as const,
  },
  {
    to: '/principal/users',
    label: 'المستخدمون',
    icon: Users,
    tint: 'cyan' as const,
  },
  {
    to: '/principal/bulk-accounts',
    label: 'حسابات الفصل',
    icon: UserPlus,
    tint: 'purple' as const,
  },
  {
    to: '/principal/bulk-upload',
    label: 'رفع جماعي',
    icon: BookOpen,
    tint: 'orange' as const,
  },
  {
    to: '/principal/settings',
    label: 'الصفوف',
    icon: Settings,
    tint: 'lime' as const,
  },
];

const OLYMPIAD_REPORTS_OPS = [
  {
    to: '/admin/reports-hub',
    label: 'تقارير أولمبياد',
    icon: BarChart3,
    tint: 'orange' as const,
  },
  {
    to: '/principal/reports',
    label: 'تقارير المدرسة',
    icon: BarChart3,
    tint: 'purple' as const,
  },
  {
    to: '/exams',
    label: 'الاختبارات',
    icon: ClipboardList,
    tint: 'cyan' as const,
  },
  {
    to: '/analytics',
    label: 'التحليلات',
    icon: TrendingUp,
    tint: 'lime' as const,
  },
];

const ACADEMIC_ACTIONS = [
  {
    to: '/academic',
    label: 'أكاديمي',
    icon: BookOpen,
    tint: 'orange' as const,
  },
  {
    to: '/principal/academic/monitoring',
    label: 'مراقبة',
    icon: BarChart3,
    tint: 'cyan' as const,
  },
  {
    to: '/principal/academic',
    label: 'إدارة أكاديمية',
    icon: Settings,
    tint: 'purple' as const,
  },
  {
    to: '/academic/reviews',
    label: 'المراجعات',
    icon: FileText,
    tint: 'lime' as const,
  },
  {
    to: '/academic/observation-inbox',
    label: 'ملاحظات',
    icon: ClipboardList,
    tint: 'pink' as const,
  },
  {
    to: '/academic/export',
    label: 'تصدير',
    icon: FileText,
    tint: 'orange' as const,
  },
];

export function PrincipalDashboard() {
  const { user, role } = useAuthStore();
  const [checklistHidden, setChecklistHidden] = useState(isChecklistDismissed());
  const appMode = useTeacherModeStore((s) => s.mode);
  const setAppMode = useTeacherModeStore((s) => s.setMode);
  const showOlympiad = appMode === 'olympiad';
  const showAcademic = appMode === 'academic';
  const schoolOps = OLYMPIAD_SCHOOL_OPS.filter((a) => isOlympiadNavPath(a.to));
  const reportOps = OLYMPIAD_REPORTS_OPS.filter((a) => isOlympiadNavPath(a.to));
  const academicOpsActions = ACADEMIC_ACTIONS.filter((a) => isAcademicNavPath(a.to));
  const firstName = (user?.full_name ?? '').trim().split(/\s+/)[0] || 'مدير المدرسة';

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
        presentCount,
        absentCount: attendanceRows.length - presentCount,
      };
    },
  });

  const { data: academic, isLoading: academicLoading } = useQuery({
    queryKey: ['principal', 'academic-snapshot'],
    queryFn: fetchAcademicSnapshot,
    enabled: showAcademic,
    refetchInterval: showAcademic ? 120_000 : false,
  });

  const olympiadOps = useMemo((): GlassOpsItem[] => {
    if (!alertData?.alerts?.length) return [];
    return alertData.alerts.slice(0, 6).map((a) => ({
      id: a.id,
      title: a.title,
      detail: a.detail,
      to: a.actionPath,
      tone: a.severity === 'critical' || a.severity === 'warning' ? 'warn' : 'info',
    }));
  }, [alertData]);

  const academicOps = useMemo((): GlassOpsItem[] => {
    if (!academic) return [];
    const items: GlassOpsItem[] = [];
    if (academic.pendingParentRequests > 0) {
      items.push({
        id: 'parent-req',
        title: `${academic.pendingParentRequests} طلب ولي أمر معلّق`,
        to: '/academic/observation-inbox',
        tone: 'warn',
      });
    }
    if (academic.pendingReviews > 0) {
      items.push({
        id: 'reviews',
        title: `${academic.pendingReviews} مراجعة بانتظار الاعتماد`,
        to: '/academic/reviews',
        tone: 'warn',
      });
    }
    if (academic.teachersMissingHomeworkToday > 0) {
      items.push({
        id: 'missing-hw',
        title: `${academic.teachersMissingHomeworkToday} معلم بلا واجب اليوم`,
        to: '/academic/homework',
        tone: 'info',
      });
    }
    return items;
  }, [academic]);

  const attendanceDonut = useMemo(() => {
    const present = stats?.presentCount ?? 0;
    const absent = Math.max(0, stats?.absentCount ?? 0);
    return [
      { name: 'حاضر', value: present },
      { name: 'غائب', value: absent },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const miniArea = useMemo(
    () => [
      { label: 'طلاب', value: stats?.students ?? 0 },
      { label: 'حضور%', value: stats?.attendancePct ?? 0 },
      { label: 'اختبارات', value: (stats?.activeExams ?? 0) * 10 },
    ],
    [stats],
  );

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
          badge={role ? ROLE_LABELS[role] : PLATFORM_NAME}
          subtitle={
            showOlympiad
              ? `وضع أولمبياد — إدارة النقاط والطلاب والاختبارات · ${PLATFORM_NAME}`
              : `وضع أكاديمي — الشؤون الأكاديمية والمراقبة · ${PLATFORM_NAME}`
          }
        />

        <ModeWorkspaceBanner mode={appMode} homeTo="/dashboard" />

        <GlassCard padding="sm" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-[var(--glass-muted)]">
            أنت في <span className="text-[var(--glass-text)] font-semibold">{TEACHER_MODE_LABELS[appMode]}</span>
            {' — '}القائمة الجانبية تعرض روابط هذا الوضع فقط
          </p>
          <TeacherModeToggle mode={appMode} onChange={setAppMode} />
        </GlassCard>

        {showOlympiad && !checklistHidden && (
          <GlassCard padding="sm">
            <SetupChecklist
              onDismiss={() => {
                dismissChecklist();
                setChecklistHidden(true);
              }}
            />
          </GlassCard>
        )}

        {showOlympiad && (
          <>
            {isLoading ? (
              <GlassCard className="py-12 flex justify-center">
                <TapHandLoader label="جاري تحميل الإحصائيات..." />
              </GlassCard>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <GlassKpiCard
                  label="إجمالي الطلاب"
                  value={stats?.students ?? 0}
                  accent="purple"
                />
                <GlassKpiCard
                  label="نسبة الحضور"
                  value={stats?.attendancePct != null ? `${stats.attendancePct}%` : '—'}
                  accent="lime"
                  trendPct={stats?.attendancePct != null ? Math.min(99, Math.round((stats.attendancePct - 70) / 2)) : null}
                  trendLabel="مقابل هدف 70%"
                />
                <GlassKpiCard
                  label="الاختبارات النشطة"
                  value={stats?.activeExams ?? 0}
                  accent="cyan"
                />
                <GlassKpiCard
                  label="تنبيهات"
                  value={alertData?.alerts?.length ?? 0}
                  accent="orange"
                />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="lg:col-span-3">
                <GlassAreaChartCard
                  title="لمحة تشغيلية"
                  subtitle="مؤشرات المدرسة الحالية"
                  data={miniArea}
                />
              </div>
              <div className="lg:col-span-2">
                <GlassDonutCard
                  title="توزيع الحضور"
                  subtitle="من سجلات الحضور"
                  data={attendanceDonut}
                  centerLabel="سجلات"
                  centerValue={(stats?.presentCount ?? 0) + Math.max(0, stats?.absentCount ?? 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4">
              <div className="xl:col-span-5">
                <GlassOpsList title="مهام اليوم — أولمبياد" items={olympiadOps} />
              </div>
              <div className="xl:col-span-3">
                <GlassCard className="h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-[var(--glass-purple)]" />
                    <h3 className="text-sm font-bold text-[var(--glass-text)]">تشغيل المدرسة</h3>
                  </div>
                  <GlassQuickGrid className="!grid-cols-2">
                    {schoolOps.slice(0, 6).map((action) => (
                      <GlassQuickAction key={action.to} {...action} />
                    ))}
                  </GlassQuickGrid>
                </GlassCard>
              </div>
              <div className="xl:col-span-4">
                <GlassCard className="h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <ScrollText className="w-4 h-4 text-[var(--glass-indigo)]" />
                    <h3 className="text-sm font-bold text-[var(--glass-text)]">تقارير ومتابعة</h3>
                  </div>
                  <GlassQuickGrid className="!grid-cols-2">
                    {reportOps.map((action) => (
                      <GlassQuickAction key={action.to} {...action} />
                    ))}
                  </GlassQuickGrid>
                </GlassCard>
              </div>
            </div>
          </>
        )}

        {showAcademic && (
          <>
            <GlassCard>
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-[var(--glass-text)]">الشؤون الأكاديمية</h2>
                  <p className="text-sm text-[var(--glass-muted)] mt-1">مؤشرات اليوم</p>
                </div>
                {academic && academic.teachersMissingHomeworkToday > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[rgba(245,158,11,0.14)] text-[#b45309] border border-[rgba(245,158,11,0.25)]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {academic.teachersMissingHomeworkToday} معلم بلا واجب اليوم
                  </span>
                )}
              </div>
              {academicLoading ? (
                <TapHandLoader label="جاري تحميل المؤشرات..." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <GlassKpiCard
                    label="واجبات اليوم"
                    value={academic?.homeworkToday ?? 0}
                    accent="orange"
                  />
                  <GlassKpiCard
                    label="مراجعات معلّقة"
                    value={academic?.pendingReviews ?? 0}
                    accent="purple"
                  />
                  <GlassKpiCard
                    label="طلبات أولياء الأمور"
                    value={academic?.pendingParentRequests ?? 0}
                    accent="cyan"
                  />
                </div>
              )}
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="lg:col-span-3">
                <GlassOpsList title="مهام اليوم — أكاديمي" items={academicOps} />
              </div>
              <div className="lg:col-span-2">
                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-[var(--glass-purple)]" />
                    <h3 className="text-sm font-bold text-[var(--glass-text)]">قيادة أكاديمية</h3>
                  </div>
                  <GlassQuickGrid className="!grid-cols-2">
                    {academicOpsActions.map((action) => (
                      <GlassQuickAction key={action.to} {...action} />
                    ))}
                  </GlassQuickGrid>
                </GlassCard>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </GlassShell>
  );
}
