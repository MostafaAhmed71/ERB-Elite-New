import { Archive } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';

export function DevBackupPage() {
  return (
    <RolePageShell>
      <PageHeader
        title="حالة النسخ الاحتياطي"
        subtitle="توثيق نقاط الاسترجاع — بدون أتمتة سحابية من الواجهة"
        icon={Archive}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <HorizonCard>
          <p className="text-sm font-semibold text-white mb-2">ZIPs المحلية (Versions/)</p>
          <p className="text-xs text-surface-muted leading-relaxed">
            قبل كل تعديل كبير يُنشأ أرشيف في مجلد <code className="text-white/60">Versions/</code> حسب
            قواعد إدارة الإصدارات. راجع الملفات على القرص أو عبر Git — لا تُحذف إلا بطلب صريح.
          </p>
        </HorizonCard>
        <HorizonCard>
          <p className="text-sm font-semibold text-white mb-2">Supabase</p>
          <p className="text-xs text-surface-muted leading-relaxed">
            النسخ الاحتياطي لقاعدة البيانات يُدار من لوحة Supabase (PITR / Daily backups حسب الخطة).
            هذه الصفحة لا تعرض مفاتيح ولا تشغّل استعادة.
          </p>
        </HorizonCard>
      </div>

      <HorizonCard className="mt-4">
        <p className="text-sm text-white/80">
          الإصدار الحالي موثّق في <code className="text-white/60">VERSION.md</code> و{' '}
          <code className="text-white/60">/dev/version</code>.
        </p>
      </HorizonCard>
    </RolePageShell>
  );
}
