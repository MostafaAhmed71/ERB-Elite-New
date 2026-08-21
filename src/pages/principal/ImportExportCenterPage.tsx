import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight, Upload, UserPlus, HelpCircle, FileSpreadsheet,
  ScrollText, LayoutTemplate, HardDrive,
} from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard, HorizonActionCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { getQuestionRepoStats } from '../../lib/platformAudit';
import { useAuthStore } from '../../stores/authStore';

const LINKS = [
  {
    to: '/principal/bulk-upload',
    label: 'رفع طلاب جماعي',
    description: 'Excel / CSV → فصول',
    icon: Upload,
    accent: 'gold' as const,
    roles: ['principal', 'admin'] as const,
  },
  {
    to: '/principal/bulk-accounts',
    label: 'توليد حسابات الفصل',
    description: 'إنشاء حسابات جماعية',
    icon: UserPlus,
    accent: 'blue' as const,
    roles: ['principal', 'admin'] as const,
  },
  {
    to: '/questions',
    label: 'مستودع الأسئلة',
    description: 'استيراد QTI / Excel داخل البنك',
    icon: HelpCircle,
    accent: 'purple' as const,
    roles: ['principal', 'admin', 'supervisor'] as const,
  },
  {
    to: '/academic/export',
    label: 'تصدير أكاديمي',
    description: 'كشوف وملفات أكاديمية',
    icon: FileSpreadsheet,
    accent: 'blue' as const,
    roles: ['principal', 'admin', 'deputy', 'supervisor', 'teacher'] as const,
  },
  {
    to: '/principal/academic/export-templates',
    label: 'قوالب التصدير',
    description: 'تخصيص تخطيط التصدير',
    icon: LayoutTemplate,
    accent: 'gold' as const,
    roles: ['principal', 'admin'] as const,
  },
  {
    to: '/principal/audit-logs',
    label: 'سجل الأحداث / امتثال',
    description: 'تصدير CSV وامتثال P7',
    icon: ScrollText,
    accent: 'purple' as const,
    roles: ['principal', 'admin'] as const,
  },
];

export function ImportExportCenterPage() {
  const { role } = useAuthStore();
  const statsQuery = useQuery({
    queryKey: ['school', 'question-repo-stats'],
    queryFn: getQuestionRepoStats,
    retry: false,
    enabled: role === 'principal' || role === 'admin' || role === 'supervisor',
  });

  const visible = LINKS.filter((l) => !role || (l.roles as readonly string[]).includes(role));

  return (
    <RolePageShell>
      <PageHeader
        title="مركز الاستيراد والتصدير"
        subtitle="نقطة دخول موحّدة لعمليات البيانات المدرسية — دون أدوات مطور"
        icon={ArrowLeftRight}
      />

      <HorizonCard className="mb-4 border border-white/5">
        <div className="flex items-start gap-3">
          <HardDrive className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
          <p className="text-sm text-surface-muted leading-relaxed">
            استخدم البطاقات أدناه للرفع والتصدير. مراقبة الأعطال التقنية (Jobs / Storage) تتم في مساحة المطور
            عند الحاجة.
            {statsQuery.data ? (
              <span className="block mt-2 text-white/70">
                مستودع الأسئلة: <strong className="text-white">{statsQuery.data.total}</strong> سؤال ·{' '}
                {statsQuery.data.recent_7d} أُضيفت خلال 7 أيام
              </span>
            ) : null}
          </p>
        </div>
      </HorizonCard>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {visible.map(({ to, label, description, icon, accent }) => (
          <HorizonActionCard
            key={to}
            to={to}
            label={label}
            description={description}
            icon={icon}
            accent={accent}
          />
        ))}
      </div>

      {role === 'supervisor' && (
        <p className="text-xs text-surface-muted mt-4">
          للمشرف: الاستيراد التفصيلي للأسئلة من{' '}
          <Link to="/questions" className="text-gold-400 hover:underline">مستودع الأسئلة</Link>.
        </p>
      )}
    </RolePageShell>
  );
}
