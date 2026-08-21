import { Server } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';

function maskUrl(url: string | undefined): string {
  if (!url) return '— غير مضبوط —';
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '(رابط غير صالح)';
  }
}

export function DevEnvironmentPage() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const whatsappUrl = import.meta.env.VITE_WHATSAPP_API_URL as string | undefined;
  const mode = import.meta.env.MODE;
  const dev = import.meta.env.DEV;

  return (
    <RolePageShell>
      <PageHeader
        title="معلومات البيئة"
        subtitle="روابط وإعدادات البناء — بدون أسرار"
        icon={Server}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <HorizonCard>
          <p className="text-xs text-surface-muted mb-1">Vite mode</p>
          <p className="text-lg font-bold text-white">{mode}</p>
          <p className="text-sm text-surface-muted mt-2">{dev ? 'Development' : 'Production build'}</p>
        </HorizonCard>
        <HorizonCard>
          <p className="text-xs text-surface-muted mb-1">Supabase URL</p>
          <p className="text-sm font-mono text-emerald-300/90 break-all">{maskUrl(supabaseUrl)}</p>
          <p className="text-xs text-white/40 mt-3">المفتاح anon غير معروض هنا عمداً.</p>
        </HorizonCard>
        <HorizonCard>
          <p className="text-xs text-surface-muted mb-1">WhatsApp API</p>
          <p className="text-sm font-mono text-white/80 break-all">{maskUrl(whatsappUrl)}</p>
        </HorizonCard>
        <HorizonCard>
          <p className="text-xs text-surface-muted mb-1">ملاحظات أمان</p>
          <ul className="text-sm text-surface-muted space-y-1 list-disc list-inside">
            <li>لا تُعرض مفاتيح OpenRouter أو service_role في الواجهة.</li>
            <li>أسرار AI على Supabase Secrets فقط.</li>
            <li>Sandbox وDB Explorer للمطور فقط.</li>
          </ul>
        </HorizonCard>
      </div>
    </RolePageShell>
  );
}
