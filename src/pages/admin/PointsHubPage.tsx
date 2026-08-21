import { useState } from 'react';
import { Award, CheckCircle, MinusCircle, ScrollText } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { HubTabs } from '../../components/ui/HubTabs';
import { GrantPointsPage } from '../points/GrantPointsPage';
import { ApprovePointsPage } from '../points/ApprovePointsPage';
import { PointsLogPage } from './PointsLogPage';
import { usePendingPointsCount } from '../../hooks/usePendingPointsCount';

type Tab = 'grant' | 'deduct' | 'approve' | 'log';

export function PointsHubPage() {
  const [tab, setTab] = useState<Tab>('grant');
  const { data: pendingCount = 0 } = usePendingPointsCount();

  return (
    <RolePageShell>
      <PageHeader
        title="مركز إدارة النقاط"
        subtitle="منح، خصم، موافقة، وسجل العمليات في مكان واحد"
        icon={Award}
        badge={pendingCount > 0 ? `${pendingCount} معلّق` : undefined}
        guidePath="/admin/points"
      />

      <HubTabs
        ariaLabel="أقسام مركز النقاط"
        activeId={tab}
        onChange={setTab}
        tabs={[
          { id: 'grant', label: 'منح النقاط', icon: Award },
          { id: 'deduct', label: 'خصم النقاط', icon: MinusCircle },
          {
            id: 'approve',
            label: 'الموافقة',
            icon: CheckCircle,
            badge: pendingCount > 0 ? pendingCount : undefined,
          },
          { id: 'log', label: 'السجل', icon: ScrollText },
        ]}
      />

      <div className="min-h-[400px]">
        {tab === 'grant' && <GrantPointsPage embedded mode="grant" />}
        {tab === 'deduct' && <GrantPointsPage embedded mode="deduct" />}
        {tab === 'approve' && <ApprovePointsPage embedded />}
        {tab === 'log' && <PointsLogPage embedded />}
      </div>
    </RolePageShell>
  );
}
