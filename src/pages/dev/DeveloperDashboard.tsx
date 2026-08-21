import { Link } from 'react-router-dom';
import {
  Activity, ShieldAlert, ListOrdered, Sparkles, GitBranch, Server,
  FlaskConical, Bug, Table, FileSearch, HardDrive, Database, HelpCircle, Inbox,
} from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { HorizonCard, HorizonWelcomeCard, HorizonActionCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { useAuthStore } from '../../stores/authStore';
import { PLATFORM_NAME } from '../../lib/branding';

const QUICK = [
  { to: '/dev/support', label: 'الشكاوى والطلبات', description: 'صندوق بلاغات الدعم الفني من المستخدمين', icon: Inbox, accent: 'gold' as const },
  { to: '/dev/health', label: 'صحة النظام', description: 'API · DB · Storage · WhatsApp · AI', icon: Activity, accent: 'gold' as const },
  { to: '/dev/errors', label: 'مراقبة الأخطاء', description: 'GEM · حرجة · تحليلات · حل', icon: ShieldAlert, accent: 'purple' as const },
  { to: '/dev/jobs', label: 'Background Jobs', description: 'Progress · Retry · Logs', icon: ListOrdered, accent: 'blue' as const },
  { to: '/dev/pipeline', label: 'أنبوب المحتوى', description: 'حالات · مراجعة · Jobs', icon: GitBranch, accent: 'gold' as const },
  { to: '/dev/ai/usage', label: 'مراقبة AI', description: 'طلبات · مزودون · أخطاء', icon: Sparkles, accent: 'purple' as const },
  { to: '/dev/knowledge', label: 'قاعدة المعرفة', description: 'RAG · Reindex · Embeddings', icon: Database, accent: 'blue' as const },
  { to: '/dev/questions', label: 'مستودع الأسئلة', description: 'إحصاءات · أخطاء · Jobs', icon: HelpCircle, accent: 'blue' as const },
  { to: '/dev/import-export', label: 'استيراد/تصدير', description: 'فشل Jobs · امتثال · ملفات', icon: HardDrive, accent: 'gold' as const },
  { to: '/dev/sandbox', label: 'Sandbox', description: 'اختبار خدمات بدون أثر مدرسي', icon: FlaskConical, accent: 'gold' as const },
  { to: '/dev/debug', label: 'Debug Mode', description: 'Network · Realtime · Performance', icon: Bug, accent: 'purple' as const },
  { to: '/dev/db', label: 'مستكشف DB', description: 'قراءة فقط · تصدير CSV محدود', icon: Table, accent: 'blue' as const },
  { to: '/dev/audit', label: 'Audit Center', description: 'قبل/بعد · جهاز · نتيجة', icon: FileSearch, accent: 'gold' as const },
  { to: '/dev/storage', label: 'التخزين', description: 'Supabase Storage · Hostinger', icon: HardDrive, accent: 'blue' as const },
  { to: '/dev/version', label: 'Version Center', description: 'الإصدار · Migrations · Edge', icon: GitBranch, accent: 'gold' as const },
  { to: '/dev/environment', label: 'البيئة', description: 'روابط · إعدادات بلا أسرار', icon: Server, accent: 'purple' as const },
];

export function DeveloperDashboard() {
  const { user } = useAuthStore();
  const avatar = user?.full_name?.charAt(0) ?? 'م';

  return (
    <RolePageShell>
      <HorizonWelcomeCard
        title={`مرحباً، ${user?.full_name?.split(' ')[0] ?? 'مطور'}`}
        subtitle={`${PLATFORM_NAME} — مساحة مطور المنصة`}
        role="Platform Developer"
        avatar={avatar}
      />

      <HorizonCard className="border border-emerald-500/20">
        <p className="text-sm text-surface-muted leading-relaxed">
          هذه المساحة تقنية بالكامل. لا تتضمن إدارة طلاب أو نقاط أو واجبات.
          مساحة المطور مكتملة الأساس: مراقبة، Jobs، ملفات، AI/Knowledge، Audit، Sandbox، DB Explorer، Flags.
        </p>
      </HorizonCard>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {QUICK.map((card) => (
          <HorizonActionCard key={card.to} {...card} />
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-surface-muted">
        <Link to="/dev/tools/feature-flags" className="hover:text-emerald-300 underline-offset-2 hover:underline">
          Feature Flags
        </Link>
        <span>·</span>
        <Link to="/dev/backup" className="hover:text-emerald-300 underline-offset-2 hover:underline">
          Backup Status
        </Link>
        <span>·</span>
        <Link to="/dev/monitor/whatsapp" className="hover:text-emerald-300 underline-offset-2 hover:underline">
          WhatsApp Monitor
        </Link>
      </div>
    </RolePageShell>
  );
}
