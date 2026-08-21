import { Bug } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { useAuthStore } from '../../stores/authStore';
import {
  DEV_DEBUG_STORAGE_KEY,
  isDevDebugModeEnabled,
  setDevDebugModeEnabled,
} from '../../lib/devDebugMode';

export { isDevDebugModeEnabled } from '../../lib/devDebugMode';

export function DevDebugModePage() {
  const role = useAuthStore((s) => s.role);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (role !== 'platform_developer') {
      setEnabled(false);
      setDevDebugModeEnabled(false);
      return;
    }
    setEnabled(isDevDebugModeEnabled());
    const onChange = () => setEnabled(isDevDebugModeEnabled());
    window.addEventListener('erb-dev-debug-change', onChange);
    return () => window.removeEventListener('erb-dev-debug-change', onChange);
  }, [role]);

  const toggle = () => {
    if (role !== 'platform_developer') return;
    setDevDebugModeEnabled(!enabled);
    setEnabled(!enabled);
  };

  return (
    <RolePageShell>
      <PageHeader
        title="Debug Mode"
        subtitle="طبقة عائمة: شبكة · سجلات · تنقل — للمطور فقط"
        icon={Bug}
      />

      <HorizonCard className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-white font-semibold">تفعيل وضع التشخيص</p>
          <p className="text-sm text-surface-muted mt-1">
            يظهر شريط Debug فوق أي صفحة (مدرسة أو /dev). يُسجّل أزمنة الشبكة دون توكنات أو أجسام طلبات.
            يُطفأ تلقائياً عند الخروج إن رُبط من العميل.
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          className={
            enabled
              ? 'px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
              : 'px-4 py-2.5 rounded-xl bg-white/5 text-white/70 border border-white/10 font-semibold'
          }
        >
          {enabled ? 'مفعّل' : 'معطّل'}
        </button>
      </HorizonCard>

      <HorizonCard>
        <p className="text-sm text-surface-muted leading-relaxed">
          الحالة:{' '}
          <span className={enabled ? 'text-emerald-300 font-semibold' : 'text-white/50 font-semibold'}>
            {enabled ? 'ON — الطبقة العائمة نشطة' : 'OFF'}
          </span>
          . المفتاح: <code className="text-white/60">{DEV_DEBUG_STORAGE_KEY}</code>
        </p>
      </HorizonCard>
    </RolePageShell>
  );
}
