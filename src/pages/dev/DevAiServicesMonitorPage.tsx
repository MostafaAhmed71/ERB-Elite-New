import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { aiCreditsService } from '../../lib/ai/aiAssistantService';
import { getSystemFlags } from '../../lib/platformDevTools';

export function DevAiServicesMonitorPage() {
  const flagsQuery = useQuery({
    queryKey: ['dev', 'ai-monitor', 'flags'],
    queryFn: getSystemFlags,
    retry: false,
  });

  const usageQuery = useQuery({
    queryKey: ['dev', 'ai-monitor', 'usage'],
    queryFn: () => aiCreditsService.usageStats(new Date(Date.now() - 7 * 864e5).toISOString()),
    retry: false,
  });

  return (
    <RolePageShell>
      <PageHeader
        title="مراقبة خدمات AI"
        subtitle="مزودون · أعلام · ملخص أسبوعي"
        icon={Sparkles}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <HorizonCard className="!p-4">
          <p className="text-[10px] text-surface-muted">توليد AI</p>
          <p className="text-lg font-bold text-white mt-1">
            {flagsQuery.data?.ai_generate_enabled === false ? 'OFF' : 'ON'}
          </p>
        </HorizonCard>
        <HorizonCard className="!p-4">
          <p className="text-[10px] text-surface-muted">نجاح (7 أيام)</p>
          <p className="text-lg font-bold text-white mt-1">{usageQuery.data?.success_count ?? '—'}</p>
        </HorizonCard>
        <HorizonCard className="!p-4">
          <p className="text-[10px] text-surface-muted">فشل</p>
          <p className="text-lg font-bold text-white mt-1">{usageQuery.data?.failed_count ?? '—'}</p>
        </HorizonCard>
        <HorizonCard className="!p-4">
          <p className="text-[10px] text-surface-muted">متوسط الزمن</p>
          <p className="text-lg font-bold text-white mt-1">
            {usageQuery.data ? `${usageQuery.data.avg_execution_ms} ms` : '—'}
          </p>
        </HorizonCard>
      </div>

      <HorizonCard>
        <p className="text-sm text-surface-muted leading-relaxed">
          التفاصيل الكاملة في{' '}
          <Link to="/dev/ai/usage" className="text-gold-400 hover:underline">/dev/ai/usage</Link>
          {' · '}
          المعرفة في{' '}
          <Link to="/dev/knowledge" className="text-gold-400 hover:underline">/dev/knowledge</Link>
          {' · '}
          الأعلام في{' '}
          <Link to="/dev/tools/feature-flags" className="text-gold-400 hover:underline">Feature Flags</Link>.
        </p>
      </HorizonCard>
    </RolePageShell>
  );
}
