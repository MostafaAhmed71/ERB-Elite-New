import { useState } from 'react';
import { CalendarCheck, Upload, ClipboardList, BarChart3 } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../components/ui/PageHeader';
import { AttendanceUploadTab } from '../../components/admin/AttendanceUploadTab';
import { AttendanceReportTab } from '../../components/admin/AttendanceReportTab';
import { AttendancePage } from '../attendance/AttendancePage';

type Tab = 'upload' | 'daily' | 'reports';

const TABS: { id: Tab; label: string; icon: typeof Upload }[] = [
  { id: 'upload', label: 'رفع ملف', icon: Upload },
  { id: 'daily', label: 'تسجيل يومي', icon: ClipboardList },
  { id: 'reports', label: 'التقارير', icon: BarChart3 },
];

export function AdminAttendanceHubPage() {
  const [tab, setTab] = useState<Tab>('upload');

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="الحضور والغياب"
        subtitle="رفع ملف أسبوعي أو شهري، تسجيل يومي، وتقارير الحضور"
        icon={CalendarCheck}
        guidePath="/admin/attendance"
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
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {tab === 'upload' && <AttendanceUploadTab />}
        {tab === 'daily' && <AttendancePage />}
        {tab === 'reports' && <AttendanceReportTab />}
      </div>
    </div>
  );
}
