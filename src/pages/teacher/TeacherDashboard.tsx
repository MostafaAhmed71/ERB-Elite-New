import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Award, Users, Trophy, Bell, ArrowLeft, AlertTriangle, BarChart3, BookOpen } from 'lucide-react';
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

const QUICK_ACTIONS = [
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
    description: 'T7 — عدة طلاب + نشاط واحد',
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
    description: 'T9 — درس + اختبار قصير',
    icon: BookOpen,
    accent: 'purple' as const,
  },
  {
    to: '/teacher/analytics',
    label: 'تحليلات مادتي',
    description: 'S6 — أضعف المهارات في مادتك',
    icon: BarChart3,
    accent: 'blue' as const,
  },
];

const ACTION_FEATURE: Record<string, string> = {
  '/points/grant': 'widget:teacher:quick_grant',
  '/points/grant?bulk=1': 'widget:teacher:quick_bulk',
  '/students': 'widget:teacher:quick_students',
  '/students/class-board': 'widget:teacher:quick_board',
  '/teacher/lesson-plan': 'widget:teacher:quick_lesson',
  '/teacher/analytics': 'widget:teacher:quick_analytics',
};

const REMINDER_STYLES = {
  warning: 'border-amber-500/30 bg-amber-500/10',
  info: 'border-blue-500/25 bg-blue-500/10',
};

export function TeacherDashboard() {
  const { user, role } = useAuthStore();
  const { isVisible } = useFeatureVisibilityHelpers();

  const visibleActions = QUICK_ACTIONS.filter((a) => isVisible(ACTION_FEATURE[a.to] ?? a.to));

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['teacher', 'reminders', user?.id],
    queryFn: () => fetchTeacherReminders(user!.id),
    enabled: !!user,
    refetchInterval: 60_000,
  });

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
          subtitle={`مرحباً بك في ${PLATFORM_NAME}`}
          role={role ? ROLE_LABELS[role] : undefined}
          avatar={user?.full_name?.charAt(0) ?? 'م'}
        />

        <FeatureGate featureId="widget:teacher:budget_banner">
          <TeacherBudgetBanner />
        </FeatureGate>

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

        {visibleActions.length > 0 && (
        <HorizonCard>
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">الإجراءات السريعة</h2>
            <p className="text-sm font-medium text-[#A3AED0] mt-1">اختصارات لمهامك اليومية</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {visibleActions.map((action) => (
              <HorizonActionCard key={action.to} {...action} />
            ))}
          </div>
        </HorizonCard>
        )}
      </motion.div>
    </div>
  );
}
