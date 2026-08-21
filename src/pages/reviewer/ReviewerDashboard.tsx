import { FileText, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { academicExamReviewService } from '../../lib/academic/adminService';
import { ROLE_LABELS } from '../../types';
import { PageHeader, Panel, StatCard, QuickLink, SectionTitle } from '../../components/ui';
import { TapHandLoader } from '../../components/ui/TapHandLoader';

export function ReviewerDashboard() {
  const { user, role } = useAuthStore();

  const { data: inbox = [], isLoading } = useQuery({
    queryKey: ['academic-reviews-reviewer-inbox'],
    queryFn: () => academicExamReviewService.listForReviewer(),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title={user?.full_name ?? 'المراجع'}
        subtitle="صندوق مراجعة ملفات المعلمين قبل اعتماد المدير"
        role={role ? ROLE_LABELS[role] : undefined}
        avatar={user?.full_name?.charAt(0) ?? 'م'}
      />

      {isLoading ? (
        <TapHandLoader label="جاري التحميل..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={FileText}
            label="ملفات بانتظار المراجعة"
            value={String(inbox.length)}
            color="from-indigo-500 to-indigo-600"
            bg="bg-indigo-500/10 border-indigo-500/20"
            index={0}
          />
        </div>
      )}

      <Panel className="p-6">
        <SectionTitle icon={LayoutDashboard}>الإجراءات</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <QuickLink icon={FileText} label="صندوق المراجعات" to="/academic/reviews" />
        </div>
        <p className="text-white/45 text-sm mt-4">
          راجع ملفات المعلمين ثم أرسلها للمدير للاعتماد والنشر، أو أعدها للمعلم للتعديل.
        </p>
        <Link to="/academic/reviews" className="text-gold-400 text-sm hover:underline mt-2 inline-block">
          فتح الصندوق ←
        </Link>
      </Panel>
    </div>
  );
}
