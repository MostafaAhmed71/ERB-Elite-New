import { useState } from 'react';
import { CreditCard, QrCode, ImageIcon } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../components/ui/PageHeader';
import { ScreenGuideButton } from '../../components/admin/ScreenGuideButton';
import { AdminStudentCardsTab } from '../../components/admin/AdminStudentCardsTab';
import { ProfileImagesTab } from '../../components/admin/ProfileImagesTab';
import { StudentQRGenerator } from '../../components/shared/StudentQRGenerator';

type Tab = 'official' | 'photos' | 'qr';

const TABS: { id: Tab; label: string; icon: typeof CreditCard }[] = [
  { id: 'official', label: 'بطاقات الهوية', icon: CreditCard },
  { id: 'photos', label: 'صور الطلاب والفصول', icon: ImageIcon },
  { id: 'qr', label: 'إدارة QR', icon: QrCode },
];

export function AdminIdCardsHubPage() {
  const [tab, setTab] = useState<Tab>('official');

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="بطاقات التعريف"
        subtitle="بطاقات الهوية ورموز QR — أولمبياد المرحلة المتوسطة فقط"
        icon={CreditCard}
        guidePath="/admin/id-cards"
        actions={<ScreenGuideButton path="/admin/id-cards" />}
      />

      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-0.5">
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
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {tab === 'official' && <AdminStudentCardsTab />}
        {tab === 'photos' && <ProfileImagesTab />}
        {tab === 'qr' && <StudentQRGenerator embedded />}
      </div>
    </div>
  );
}
