import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { Users, UserPlus, Shield, KeyRound } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { UserManagement } from '../../components/admin/UserManagement';
import { BulkAccountGenerator } from '../../components/users/BulkAccountGenerator';
import { ManagedAccountsPanel } from '../../components/users/ManagedAccountsPanel';
import { ScreenGuideButton } from '../../components/admin/ScreenGuideButton';

type UsersTab = 'list' | 'bulk' | 'credentials';

const TABS: { id: UsersTab; label: string; icon: typeof Users }[] = [
  { id: 'list', label: 'قائمة المستخدمين', icon: Users },
  { id: 'bulk', label: 'توليد حسابات الفصل', icon: UserPlus },
  { id: 'credentials', label: 'الحسابات المُولَّدة', icon: KeyRound },
];

export function AdminUsersHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: UsersTab =
    tabParam === 'bulk' ? 'bulk' : tabParam === 'credentials' ? 'credentials' : 'list';

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
        subtitle="إدارة الحسابات، توليد حسابات الفصل، ومراجعة بيانات الدخول"
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
                ? 'bg-[#422AFB] text-white shadow-lg shadow-[#422AFB]/20'
                : 'text-[#A3AED0] hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'list' && <UserManagement embedded />}
      {activeTab === 'bulk' && <BulkAccountGenerator embedded />}
      {activeTab === 'credentials' && <ManagedAccountsPanel />}
    </div>
  );
}
