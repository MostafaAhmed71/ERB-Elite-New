import { useState } from 'react';
import { Award, CheckCircle, MinusCircle, ScrollText } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../components/ui/PageHeader';
import { GrantPointsPage } from '../points/GrantPointsPage';
import { ApprovePointsPage } from '../points/ApprovePointsPage';
import { PointsLogPage } from './PointsLogPage';
import { usePendingPointsCount } from '../../hooks/usePendingPointsCount';

type Tab = 'grant' | 'deduct' | 'approve' | 'log';

const TABS: { id: Tab; label: string; icon: typeof Award }[] = [
  { id: 'grant', label: 'منح النقاط', icon: Award },
  { id: 'deduct', label: 'خصم النقاط', icon: MinusCircle },
  { id: 'approve', label: 'الموافقة', icon: CheckCircle },
  { id: 'log', label: 'السجل', icon: ScrollText },
];

export function PointsHubPage() {
  const [tab, setTab] = useState<Tab>('grant');
  const { data: pendingCount = 0 } = usePendingPointsCount();

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="مركز إدارة النقاط"
        subtitle="منح، خصم، موافقة، وسجل العمليات في مكان واحد"
        icon={Award}
        badge={pendingCount > 0 ? `${pendingCount} معلّق` : undefined}
        guidePath="/admin/points"
      />

      <div className="flex gap-2 border-b border-white/5 pb-0.5 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px',
              tab === id
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-white/40 hover:text-white/80'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === 'approve' && pendingCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {tab === 'grant' && <GrantPointsPage embedded mode="grant" />}
        {tab === 'deduct' && <GrantPointsPage embedded mode="deduct" />}
        {tab === 'approve' && <ApprovePointsPage embedded />}
        {tab === 'log' && <PointsLogPage embedded />}
      </div>
    </div>
  );
}
