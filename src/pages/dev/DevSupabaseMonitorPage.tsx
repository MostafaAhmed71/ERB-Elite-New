import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Database } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { supabase } from '../../lib/supabase';
import { listPublicTables } from '../../lib/platformDevTools';

const EDGE = [
  'ai-generate', 'ai-knowledge-ingest', 'ai-credits', 'ai-monthly-reset',
  'jobs-worker', 'create-user', 'send-web-push', 'weekly-parent-digest',
];

export function DevSupabaseMonitorPage() {
  const dbQuery = useQuery({
    queryKey: ['dev', 'supabase', 'ping'],
    queryFn: async () => {
      const t0 = performance.now();
      const { error } = await supabase.from('users').select('id', { count: 'exact', head: true });
      return { ms: Math.round(performance.now() - t0), ok: !error, error: error?.message };
    },
    refetchInterval: 30_000,
    retry: false,
  });

  const tablesQuery = useQuery({
    queryKey: ['dev', 'supabase', 'tables'],
    queryFn: listPublicTables,
    retry: false,
  });

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  let host = '—';
  try {
    if (url) host = new URL(url).host;
  } catch {
    host = '(غير صالح)';
  }

  return (
    <RolePageShell>
      <PageHeader
        title="مراقبة Supabase"
        subtitle="صحة المشروع والدوال — بدون أسرار"
        icon={Database}
      />

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <HorizonCard className="!p-4">
          <p className="text-[10px] text-surface-muted">Host</p>
          <p className="text-sm font-mono text-white mt-1 break-all">{host}</p>
        </HorizonCard>
        <HorizonCard className="!p-4">
          <p className="text-[10px] text-surface-muted">Ping users (head)</p>
          <p className="text-xl font-bold text-white mt-1">
            {dbQuery.isLoading ? '…' : dbQuery.data?.ok ? `${dbQuery.data.ms} ms` : 'فشل'}
          </p>
        </HorizonCard>
        <HorizonCard className="!p-4">
          <p className="text-[10px] text-surface-muted">جداول public</p>
          <p className="text-xl font-bold text-white mt-1">
            {tablesQuery.data?.length ?? (tablesQuery.isError ? '—' : '…')}
          </p>
        </HorizonCard>
      </div>

      <HorizonCard className="mb-4">
        <p className="text-sm font-medium text-white mb-3">Edge Functions معروفة</p>
        <ul className="grid sm:grid-cols-2 gap-2">
          {EDGE.map((name) => (
            <li key={name} className="text-xs font-mono text-surface-muted px-2 py-1.5 rounded-lg bg-white/[0.04]">
              {name}
            </li>
          ))}
        </ul>
        <p className="text-xs text-surface-muted mt-3">
          اختبار الاستدعاء من <Link to="/dev/sandbox" className="text-gold-400 hover:underline">Sandbox</Link>
          {' · '}
          <Link to="/dev/db" className="text-gold-400 hover:underline">مستكشف DB</Link>
        </p>
      </HorizonCard>
    </RolePageShell>
  );
}
