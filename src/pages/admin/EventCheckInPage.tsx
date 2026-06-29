import { EventCheckInPanel } from '../../components/admin/EventCheckInPanel';
import { PageHeader } from '../../components/ui/PageHeader';
import { QrCode } from 'lucide-react';

export function EventCheckInPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="حضور الفعاليات"
        subtitle="مسح QR الطلاب في الفعالية لمنح النقاط تلقائياً"
        icon={QrCode}
      />
      <EventCheckInPanel />
    </div>
  );
}
