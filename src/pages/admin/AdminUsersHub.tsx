import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { Users, UserPlus, Shield, KeyRound, HeartHandshake } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { UserManagement } from '../../components/admin/UserManagement';
import { BulkAccountGenerator } from '../../components/users/BulkAccountGenerator';
import { ManagedAccountsPanel } from '../../components/users/ManagedAccountsPanel';
import { FamilyDirectoryPanel } from '../../components/users/FamilyDirectoryPanel';
import { ScreenGuideButton } from '../../components/admin/ScreenGuideButton';

type UsersTab = 'list' | 'family' | 'bulk' | 'credentials';

const TABS: { id: UsersTab; label: string; icon: typeof Users }[] = [
  { id: 'list', label: 'قائمة المستخدمين', icon: Users },
  { id: 'family', label: 'الطلاب وأولياء الأمور', icon: HeartHandshake },
  { id: 'bulk', label: 'توليد حسابات الفصل', icon: UserPlus },
  { id: 'credentials', label: 'الحسابات المُولَّدة', icon: KeyRound },
];

export function AdminUsersHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: UsersTab =
    tabParam === 'bulk'
      ? 'bulk'
      : tabParam === 'credentials'
        ? 'credentials'
        : tabParam === 'family'
          ? 'family'
          : 'list';

  const setTab = useCallback(
    (tab: UsersTab) => {
      if (tab === 'list') {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ tab }, { replace: true });
      }
    },
    [setSearchParams]
  );

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="المستخدمون والحسابات"
        subtitle="إدارة الحسابات، بيانات الطلاب وأولياء الأمور وأكواد الربط"
        icon={Shield}
        actions={<ScreenGuideButton path="/admin/users" />}
      />

      <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              activeTab === id
                ? 'bg-[var(--primary)] text-on-contrast shadow-lg shadow-[rgba(15,39,68,0.2)]'
                : 'text-[#A3AED0] hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'list' && <UserManagement embedded />}
      {activeTab === 'family' && <FamilyDirectoryPanel />}
      {activeTab === 'bulk' && <BulkAccountGenerator embedded />}
      {activeTab === 'credentials' && <ManagedAccountsPanel />}
    </div>
  );
}
