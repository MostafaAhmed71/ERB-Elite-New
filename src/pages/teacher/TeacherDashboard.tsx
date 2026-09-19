import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Award, Users, Trophy, Bell, ArrowLeft, AlertTriangle, BarChart3, BookOpen,
  Calendar, ClipboardList, FileText, QrCode,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { ROLE_LABELS } from '../../types';
import { containerVariants } from '../../lib/motionVariants';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { TeacherBudgetBanner } from '../../components/ui/TeacherBudgetBanner';
import { fetchTeacherReminders } from '../../lib/teacherReminders';
import {
  HorizonCard,
  HorizonWelcomeCard,
  HorizonActionCard,
} from '../../components/dashboard/horizon/HorizonDashboard';
import { PLATFORM_NAME } from '../../lib/branding';
import clsx from 'clsx';
import { FeatureGate } from '../../components/shared/FeatureGate';
import { useFeatureVisibilityHelpers } from '../../hooks/useFeatureVisibility';
import { TeacherModeToggle } from '../../components/teacher/TeacherModeToggle';
import { useTeacherModeStore } from '../../stores/teacherModeStore';
import { TEACHER_MODE_LABELS } from '../../lib/teacherMode';
import { useTeacherOlympiadAccess } from '../../hooks/useTeacherOlympiadAccess';
import { academicObservationService } from '../../lib/academic/adminService';
import { DailyOpsInbox, type DailyOpsItem } from '../../components/shared/DailyOpsInbox';
import { ModeWorkspaceBanner } from '../../components/teacher/ModeWorkspaceBanner';

const OLYMPIAD_ACTIONS = [
  {
    to: '/points/grant?scan=1',
    label: 'مسح QR الطالب',
    description: 'كاميرا فورية لمنح نقاط بالباركود',
    icon: QrCode,
    accent: 'gold' as const,
  },
  {
    to: '/points/grant',
    label: 'منح النقاط',
    description: 'تسجيل نقاط لطالب — يدوي أو QR',
    icon: Award,
    accent: 'gold' as const,
  },
  {
    to: '/points/grant?bulk=1',
    label: 'منح جماعي سريع',
    description: 'عدة طلاب + نشاط واحد',
    icon: Users,
    accent: 'blue' as const,
  },
  {
    to: '/students',
    label: 'طلاب الفصل',
    description: 'قائمة طلابك وملفاتهم',
    icon: Users,
    accent: 'blue' as const,
  },
  {
    to: '/students/class-board',
    label: 'لوحة الفصل',
    description: 'ترتيب طلاب فصلك',
    icon: Trophy,
    accent: 'purple' as const,
  },
  {
    to: '/teacher/lesson-plan',
    label: 'خطة الدرس',
    description: 'درس + اختبار قصير',
    icon: BookOpen,
    accent: 'purple' as const,
  },
  {
    to: '/teacher/analytics',
    label: 'تحليلات مادتي',
    description: 'أضعف المهارات في مادتك',
    icon: BarChart3,
    accent: 'blue' as const,
  },
];

const ACADEMIC_ACTIONS = [
  {
    to: '/academic/observation-tasks',
    label: 'طلبات ملاحظات الطلاب',
    description: 'تقييم سلوكي وأكاديمي لطلبات أولياء الأمور',
    icon: ClipboardList,
    accent: 'gold' as const,
  },
  {
    to: '/academic/homework',
    label: 'الواجبات',
    description: 'نشر الواجب اليومي لفصولك',
    icon: BookOpen,
    accent: 'gold' as const,
  },
  {
    to: '/academic/weekly-plans',
    label: 'الخطط الأسبوعية',
    description: 'تخطيط حصص الأسبوع',
    icon: Calendar,
    accent: 'blue' as const,
  },
  {
    to: '/academic/schedule',
    label: 'الجدول الدراسي',
    description: 'جدول الحصص والمواد',
    icon: ClipboardList,
    accent: 'purple' as const,
  },
  {
    to: '/academic/lesson-topics',
    label: 'مواضيع الدروس',
    description: 'قائمة مواضيع كل مادة',
    icon: FileText,
    accent: 'purple' as const,
  },
  {
    to: '/academic',
    label: 'مركز أكاديمي',
    description: 'مراجعات، تقارير، تواصل',
    icon: BookOpen,
    accent: 'gold' as const,
  },
];

const ACTION_FEATURE: Record<string, string> = {
  '/points/grant?scan=1': 'widget:teacher:quick_grant',
  '/points/grant': 'widget:teacher:quick_grant',
  '/points/grant?bulk=1': 'widget:teacher:quick_bulk',
  '/students': 'widget:teacher:quick_students',
  '/students/class-board': 'widget:teacher:quick_board',
  '/teacher/lesson-plan': 'widget:teacher:quick_lesson',
  '/teacher/analytics': 'widget:teacher:quick_analytics',
  '/academic/homework': 'widget:teacher:quick_homework',
  '/academic/weekly-plans': 'widget:teacher:quick_weekly_plans',
  '/academic/schedule': 'widget:teacher:quick_schedule',
  '/academic/lesson-topics': 'widget:teacher:quick_lesson_topics',
  '/academic/observation-tasks': 'widget:teacher:quick_observation_tasks',
  '/academic': 'widget:teacher:quick_academic',
};

const REMINDER_STYLES = {
  warning: 'border-amber-500/30 bg-amber-500/10',
  info: 'border-blue-500/25 bg-blue-500/10',
};

export function TeacherDashboard() {
  const { user, role } = useAuthStore();
  const { isVisible } = useFeatureVisibilityHelpers();
  const teacherMode = useTeacherModeStore((s) => s.mode);
  const setTeacherMode = useTeacherModeStore((s) => s.setMode);
  const { canAccessOlympiad } = useTeacherOlympiadAccess();

  const visibleOlympiad = OLYMPIAD_ACTIONS.filter((a) => isVisible(ACTION_FEATURE[a.to] ?? a.to));
  const visibleAcademic = ACADEMIC_ACTIONS.filter((a) => isVisible(ACTION_FEATURE[a.to] ?? a.to));
  const effectiveMode = canAccessOlympiad ? teacherMode : 'academic';
  const showOlympiad = effectiveMode === 'olympiad';
  const showAcademic = effectiveMode === 'academic';

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['teacher', 'reminders', user?.id],
    queryFn: () => fetchTeacherReminders(user!.id),
    enabled: !!user && showOlympiad,
    refetchInterval: showOlympiad ? 60_000 : false,
  });

  const { data: observationTasks = [] } = useQuery({
    queryKey: ['teacher-obs-assignments', user?.id],
    queryFn: () => academicObservationService.listMyTeacherAssignments(user!.id),
    enabled: !!user && showAcademic,
    refetchInterval: showAcademic ? 60_000 : false,
  });
  const pendingObservations = observationTasks.filter((t) => t.status === 'pending').length;

  const olympiadOps = useMemo((): DailyOpsItem[] => {
    return reminders.slice(0, 6).map((r) => ({
      id: r.id,
      title: r.title,
      detail: r.detail,
      to: r.actionPath,
      tone: r.severity === 'warning' ? 'warn' : 'info',
    }));
  }, [reminders]);

  const academicOps = useMemo((): DailyOpsItem[] => {
    if (pendingObservations <= 0) return [];
    return [
      {
        id: 'obs-pending',
        title: `${pendingObservations} طلب ملاحظة بانتظارك`,
        detail: 'إفادة سلوكية/أكاديمية لأولياء الأمور',
        to: '/academic/observation-tasks',
        tone: 'warn',
      },
    ];
  }, [pendingObservations]);

  return (
    <div className="horizon-dashboard relative min-h-full" dir="rtl">
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
          title={user?.full_name ?? 'المعلم'}
          subtitle={
            showOlympiad
              ? `وضع أولمبياد — النقاط والطلاب والتحليلات · ${PLATFORM_NAME}`
              : `وضع أكاديمي — الواجبات والخطط والجدول · ${PLATFORM_NAME}`
          }
          role={role ? ROLE_LABELS[role] : undefined}
          avatar={user?.full_name?.charAt(0) ?? 'م'}
        />

        <ModeWorkspaceBanner mode={effectiveMode} homeTo="/dashboard" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-[#A3AED0]">
            أنت في <span className="text-white font-semibold">{TEACHER_MODE_LABELS[effectiveMode]}</span>
            {' — '}
            {canAccessOlympiad
              ? 'القائمة الجانبية تعرض روابط هذا الوضع فقط'
              : 'الأولمبياد للمرحلة المتوسطة فقط — مساحتك أكاديمية'}
          </p>
          <TeacherModeToggle
            mode={effectiveMode}
            onChange={setTeacherMode}
            olympiadEnabled={canAccessOlympiad}
          />
        </div>

        {showOlympiad && (
        <FeatureGate featureId="widget:teacher:budget_banner">
          <TeacherBudgetBanner />
        </FeatureGate>
        )}

        {showOlympiad && (
          <DailyOpsInbox
            items={olympiadOps}
            title="مهام اليوم — أولمبياد"
            emptyLabel="ممتاز — منحت نقاطاً هذا الأسبوع وطلابك يتلقون المتابعة"
          />
        )}

        {showAcademic && (
          <DailyOpsInbox items={academicOps} title="مهام اليوم — أكاديمي" />
        )}

        {showOlympiad && (
        <FeatureGate featureId="widget:teacher:reminders">
        <HorizonCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">تذكيراتك</h2>
              <p className="text-sm text-[#A3AED0] mt-0.5">
                طلاب بلا نقاط · آخر منح — لضمان العدالة في الفصل
              </p>
            </div>
          </div>

          {isLoading ? (
            <TapHandLoader label="جاري التحقق..." />
          ) : reminders.length === 0 ? (
            <p className="text-sm text-emerald-400">
              ممتاز — منحت نقاطاً هذا الأسبوع وطلابك يتلقون المتابعة.
            </p>
          ) : (
            <div className="space-y-3">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  className={clsx(
                    'rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                    REMINDER_STYLES[r.severity],
                  )}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={clsx(
                        'w-5 h-5 shrink-0 mt-0.5',
                        r.severity === 'warning' ? 'text-amber-400' : 'text-blue-400',
                      )}
                    />
                    <div>
                      <p className="font-semibold text-white text-sm">{r.title}</p>
                      <p className="text-xs text-[#A3AED0] mt-1">{r.detail}</p>
                    </div>
                  </div>
                  {r.actionPath && (
                    <Link
                      to={r.actionPath}
                      className="inline-flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-xs font-semibold bg-white/[0.08] text-white hover:bg-white/[0.12] transition-colors"
                    >
                      منح الآن
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </HorizonCard>
        </FeatureGate>
        )}

        {showOlympiad && visibleOlympiad.length > 0 && (
        <HorizonCard>
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">أولمبياد النقاط</h2>
            <p className="text-sm font-medium text-[#A3AED0] mt-1">النقاط، الطلاب، والتحليلات</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {visibleOlympiad.map((action) => (
              <HorizonActionCard key={action.to} {...action} />
            ))}
          </div>
        </HorizonCard>
        )}

        {showAcademic && pendingObservations > 0 && (
          <HorizonCard className="border border-amber-500/30 bg-amber-500/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-white font-bold">طلبات ملاحظة بانتظارك</h2>
                <p className="text-sm text-[#A3AED0] mt-1">
                  لديك {pendingObservations} طلب{pendingObservations > 1 ? 'ات' : ''} بحاجة لإفادة
                </p>
              </div>
              <Link
                to="/academic/observation-tasks"
                className="inline-flex items-center gap-1.5 shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gold-500 text-navy-950 hover:bg-gold-400 transition-colors"
              >
                فتح طلبات ملاحظات الطلاب
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </HorizonCard>
        )}

        {showAcademic && visibleAcademic.length > 0 && (
        <HorizonCard>
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">الشؤون الأكاديمية</h2>
            <p className="text-sm font-medium text-[#A3AED0] mt-1">الواجبات، الخطط، والجدول</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {visibleAcademic.map((action) => (
              <HorizonActionCard key={action.to} {...action} />
            ))}
          </div>
        </HorizonCard>
        )}
      </motion.div>
    </div>
  );
}
