import { GitBranch } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';

const CURRENT_VERSION = 'v2.1.0';
const APP_DATE = '2026-08-01';

const EDGE_FUNCTIONS = [
  'ai-generate', 'ai-knowledge-ingest', 'ai-credits', 'ai-monthly-reset',
  'jobs-worker',
  'dev-error-whatsapp',
  'create-user', 'register-user', 'delete-user', 'admin-update-user',
  'create-staff-invite', 'accept-staff-invite', 'bulk-create-class-accounts',
  'send-web-push', 'weekly-parent-digest', 'send-sms-alert',
];

export function DevVersionPage() {
  return (
    <RolePageShell>
      <PageHeader
        title="Version Center"
        subtitle="إصدار المنصة وحالة المكوّنات التقنية"
        icon={GitBranch}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <HorizonCard>
          <p className="text-xs text-surface-muted mb-1">الإصدار الحالي (من سجل الإصدارات)</p>
          <p className="text-2xl font-bold text-emerald-300 tabular-nums">{CURRENT_VERSION}</p>
          <p className="text-sm text-surface-muted mt-2">تاريخ التوثيق: {APP_DATE}</p>
          <p className="text-xs text-white/40 mt-3">
            المصدر التفصيلي: <code className="text-white/60">VERSION.md</code>
          </p>
        </HorizonCard>

        <HorizonCard>
          <p className="text-xs text-surface-muted mb-1">Migrations</p>
          <p className="text-lg font-bold text-white">حتى 102</p>
          <p className="text-sm text-surface-muted mt-2">
            أحدث ملف: <code className="text-white/70">102_wave4_knowledge_probe.sql</code>
          </p>
          <p className="text-xs text-amber-300/90 mt-3">
            طبّق 101–102. موجة 4 عمق تشغيلي فوق أساسات Roadmap.
          </p>
        </HorizonCard>
      </div>

      <HorizonCard>
        <p className="text-sm font-semibold text-white mb-3">Edge Functions المعروفة</p>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {EDGE_FUNCTIONS.map((name) => (
            <li
              key={name}
              className="text-xs font-mono px-2.5 py-2 rounded-lg bg-white/[0.04] border border-white/5 text-surface-muted"
            >
              {name}
            </li>
          ))}
        </ul>
      </HorizonCard>
    </RolePageShell>
  );
}
