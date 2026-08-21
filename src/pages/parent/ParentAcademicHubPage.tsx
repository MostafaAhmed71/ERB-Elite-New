import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardList, Download, FileText } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HubTabs, type HubTabItem } from '../../components/ui/HubTabs';
import { ParentChildBar } from '../../components/parent/ParentChildBar';
import { ParentContactFooter } from '../../components/parent/ParentContactFooter';

type Tab = 'homework' | 'request' | 'requests' | 'reviews';

const TABS: HubTabItem<Tab>[] = [
  { id: 'homework', label: 'الواجبات', icon: BookOpen },
  { id: 'request', label: 'طلب ملاحظة', icon: FileText },
  { id: 'requests', label: 'طلباتي', icon: ClipboardList },
  { id: 'reviews', label: 'المراجعات', icon: Download },
];

const TAB_PATH: Record<Tab, string> = {
  homework: '/parent/academic/homework',
  request: '/parent/academic/request',
  requests: '/parent/academic/requests',
  reviews: '/parent/academic/reviews',
};

function tabFromPath(pathname: string): Tab {
  if (pathname.endsWith('/requests')) return 'requests';
  if (pathname.endsWith('/request')) return 'request';
  if (pathname.endsWith('/reviews')) return 'reviews';
  return 'homework';
}

export function ParentAcademicHubPage() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === '/parent/academic' || location.pathname === '/parent/academic/') {
    return <Navigate to="/parent/academic/homework" replace />;
  }

  const active = tabFromPath(location.pathname);

  return (
    <RolePageShell>
      <ParentChildBar />
      <PageHeader
        title="أكاديمي الأبناء"
        subtitle="واجبات، ملاحظات، ومراجعات للابن المختار"
        icon={BookOpen}
      />
      <HubTabs
        tabs={TABS}
        activeId={active}
        onChange={(id) => navigate(TAB_PATH[id])}
        ariaLabel="أقسام أكاديمي ولي الأمر"
      />
      <Outlet />
      <ParentContactFooter />
    </RolePageShell>
  );
}
