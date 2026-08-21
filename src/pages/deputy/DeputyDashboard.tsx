import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ClipboardList, FileText, Search, CalendarCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { ROLE_LABELS } from '../../types';
import { containerVariants } from '../../lib/motionVariants';
import { PLATFORM_NAME } from '../../lib/branding';
import { fetchAcademicSnapshot } from '../../lib/unifiedDashboard';
import {
  HorizonActionCard,
  HorizonWelcomeCard,
} from '../../components/dashboard/horizon/HorizonDashboard';
import { DailyOpsInbox, type DailyOpsItem } from '../../components/shared/DailyOpsInbox';
import { TapHandLoader } from '../../components/ui/TapHandLoader';

const ACTIONS = [
  {
    to: '/academic/attendance',
    label: 'الحضور والغياب',
    description: 'تسجيل يومي لفصول مرحلتك',
    icon: CalendarCheck,
    accent: 'gold' as const,
  },
  {
    to: '/academic',
    label: 'الشؤون الأكاديمية',
    description: 'بوابة الواجبات والخطط والمتابعة',
    icon: BookOpen,
    accent: 'gold' as const,
  },
  {
    to: '/academic/observation-inbox',
    label: 'صندوق الملاحظات',
    description: 'طلبات أولياء الأمور والمتابعة',
    icon: ClipboardList,
    accent: 'blue' as const,
  },
  {
    to: '/academic/reviews',
    label: 'اعتماد المراجعات',
    description: 'مراجعات بانتظار الإجراء',
    icon: FileText,
    accent: 'purple' as const,
  },
  {
    to: '/academic/search',
    label: 'بحث أكاديمي',
    description: 'البحث في المحتوى الأكاديمي',
    icon: Search,
    accent: 'blue' as const,
  },
];

export function DeputyDashboard() {
  const { user, role } = useAuthStore();

  const { data: academic, isLoading } = useQuery({
    queryKey: ['deputy', 'academic-snapshot'],
    queryFn: fetchAcademicSnapshot,
    refetchInterval: 120_000,
  });

  const opsItems = useMemo((): DailyOpsItem[] => {
    if (!academic) return [];
    const items: DailyOpsItem[] = [];
    if (academic.pendingParentRequests > 0) {
      items.push({
        id: 'parent-req',
        title: `${academic.pendingParentRequests} طلب ولي أمر معلّق`,
        detail: 'يحتاج متابعة في صندوق الملاحظات',
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
        detail: `من أصل ${academic.totalTeachers} معلم`,
        to: '/academic/homework',
        tone: 'info',
      });
    }
    if (academic.homeworkToday > 0) {
      items.push({
        id: 'hw-today',
        title: `${academic.homeworkToday} واجب مُسجَّل اليوم`,
        to: '/academic/homework',
        tone: 'ok',
      });
    }
    return items;
  }, [academic]);

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
          title={user?.full_name ?? 'وكيل الشؤون'}
          subtitle={`متابعة أكاديمية يومية · ${PLATFORM_NAME}`}
          role={role ? ROLE_LABELS[role] : undefined}
          avatar={user?.full_name?.charAt(0) ?? 'و'}
        />

        {isLoading ? (
          <TapHandLoader label="جاري تحميل مهام اليوم..." />
        ) : (
          <DailyOpsInbox items={opsItems} title="مهام اليوم الأكاديمية" />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {ACTIONS.map((action) => (
            <HorizonActionCard key={action.to} {...action} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
