import { Construction } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { PageHeader } from '../../components/ui/PageHeader';

type Props = {
  title: string;
  subtitle: string;
  roadmapHint?: string;
};

/** هيكل صفحة مطور — جاهز للربط لاحقاً دون منح صلاحيات مدرسية */
export function DevToolStubPage({ title, subtitle, roadmapHint }: Props) {
  return (
    <RolePageShell>
      <PageHeader title={title} subtitle={subtitle} icon={Construction} />
      <HorizonCard className="border border-dashed border-white/15">
        <p className="text-white font-semibold mb-2">قيد التجهيز ضمن خارطة الطريق</p>
        <p className="text-sm text-surface-muted leading-relaxed">
          {roadmapHint
            ?? 'هذه الشاشة جزء من Developer Workspace. ستُغذّى بالبيانات والمراقبة عند تنفيذ مرحلتها في Docs/SCHOOL_PLATFORM_ROADMAP.md دون خلطها بأدوات إدارة المدرسة.'}
        </p>
      </HorizonCard>
    </RolePageShell>
  );
}
