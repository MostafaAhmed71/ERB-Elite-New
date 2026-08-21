import { useState } from 'react';
import { BarChart3, Scale, School, ScrollText, TrendingUp } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HubTabs, type HubTabItem } from '../../components/ui/HubTabs';
import { TeachersReportPage } from './TeachersReportPage';
import { ClassesReportPage } from './ClassesReportPage';
import { ClassDetailReportPage } from './ClassDetailReportPage';
import { EquityReportPage } from './EquityReportPage';
import { Reports } from '../../components/admin/Reports';

type Tab = 'overview' | 'teachers' | 'classes' | 'class' | 'equity';

const TABS: HubTabItem<Tab>[] = [
  { id: 'overview', label: 'التقارير العامة', icon: BarChart3 },
  { id: 'teachers', label: 'المعلمون', icon: TrendingUp },
  { id: 'classes', label: 'الفصول', icon: BarChart3 },
  { id: 'class', label: 'تقرير فصل', icon: School },
  { id: 'equity', label: 'العدالة', icon: Scale },
];

export function OlympiadReportsHubPage() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <RolePageShell>
      <PageHeader
        title="مركز تقارير الأولمبياد"
        subtitle="تقارير المعلمين والفصول والعدالة في مكان واحد"
        icon={ScrollText}
      />
      <HubTabs tabs={TABS} activeId={tab} onChange={setTab} ariaLabel="أقسام تقارير الأولمبياد" />
      <div className="min-h-[400px]">
        {tab === 'overview' && <Reports />}
        {tab === 'teachers' && <TeachersReportPage />}
        {tab === 'classes' && <ClassesReportPage />}
        {tab === 'class' && <ClassDetailReportPage />}
        {tab === 'equity' && <EquityReportPage />}
      </div>
    </RolePageShell>
  );
}
