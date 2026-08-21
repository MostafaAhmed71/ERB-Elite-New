import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, Save } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { HubTabs, type HubTabItem } from '../../components/ui/HubTabs';
import { FeatureVisibilityPanel } from '../../components/admin/FeatureVisibilityPanel';
import {
  DEFAULT_SYSTEM_FLAGS,
  getSystemFlags,
  saveSystemFlags,
  type SystemFlags,
} from '../../lib/platformDevTools';
import { showError, showSuccess } from '../../lib/toast';
import clsx from 'clsx';

type Tab = 'system' | 'school';

const TABS: HubTabItem<Tab>[] = [
  { id: 'system', label: 'أعلام النظام' },
  { id: 'school', label: 'إخفاء الميزات المدرسية' },
];

const FLAG_LABELS: Record<keyof SystemFlags, string> = {
  maintenance_banner: 'شريط صيانة عام',
  ai_generate_enabled: 'توليد AI مفعّل',
  whatsapp_send_enabled: 'إرسال واتساب مفعّل',
  jobs_worker_enabled: 'عامل المهام مفعّل',
  sandbox_live_calls: 'Sandbox — استدعاءات حية مسموحة',
};

export function DevFeatureFlagsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('system');
  const [draft, setDraft] = useState<SystemFlags | null>(null);

  const flagsQuery = useQuery({
    queryKey: ['dev', 'system-flags'],
    queryFn: getSystemFlags,
    retry: false,
  });

  const flags = draft ?? flagsQuery.data ?? DEFAULT_SYSTEM_FLAGS;

  const saveSys = useMutation({
    mutationFn: () => saveSystemFlags(flags),
    onSuccess: () => {
      showSuccess('حُفظت أعلام النظام');
      setDraft(null);
      qc.invalidateQueries({ queryKey: ['dev', 'system-flags'] });
    },
    onError: (e: Error) => showError(e),
  });

  const missing = flagsQuery.error?.message?.includes('dev_get_system');

  return (
    <RolePageShell>
      <PageHeader
        title="Feature Flags"
        subtitle="أعلام تشغيل النظام فوق إخفاء الميزات المدرسية"
        icon={Flag}
      />

      {missing && (
        <HorizonCard className="border border-amber-500/30 mb-4">
          <p className="text-sm text-amber-200/90">طبّق migration <code className="text-xs">096</code></p>
        </HorizonCard>
      )}

      <HubTabs tabs={TABS} activeId={tab} onChange={setTab} className="mb-4" ariaLabel="أقسام الأعلام" />

      {tab === 'system' ? (
        <HorizonCard>
          <div className="space-y-3">
            {(Object.keys(FLAG_LABELS) as (keyof SystemFlags)[]).map((key) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0"
              >
                <span className="text-sm text-white/90">{FLAG_LABELS[key]}</span>
                <button
                  type="button"
                  onClick={() => setDraft({ ...flags, [key]: !flags[key] })}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border',
                    flags[key]
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-white/5 text-white/50 border-white/10',
                  )}
                >
                  {flags[key] ? 'ON' : 'OFF'}
                </button>
              </label>
            ))}
          </div>
          <div className="mt-4">
            <Button size="sm" onClick={() => saveSys.mutate()} disabled={saveSys.isPending || !draft}>
              <Save className="w-3.5 h-3.5" />
              حفظ أعلام النظام
            </Button>
          </div>
        </HorizonCard>
      ) : (
        <HorizonCard>
          <p className="text-xs text-surface-muted mb-4 leading-relaxed">
            تعديل ظهور القوائم/الودجات للأدوار المدرسية. الحفظ من هنا يمر عبر RPC المطور.
          </p>
          <FeatureVisibilityPanel />
        </HorizonCard>
      )}
    </RolePageShell>
  );
}
