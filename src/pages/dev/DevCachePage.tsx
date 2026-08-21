import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { showSuccess, showError } from '../../lib/toast';

const KNOWN_LOCAL_KEYS = [
  'erb_dev_debug_mode',
  'erb_parent_selected_child',
  'erb_teacher_app_mode',
];

export function DevCachePage() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);

  const clearReactQuery = () => {
    qc.clear();
    showSuccess('مُسح كاش React Query لهذه الجلسة');
  };

  const clearLocal = () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    try {
      for (const k of KNOWN_LOCAL_KEYS) localStorage.removeItem(k);
      setConfirm(false);
      showSuccess('مُسحت مفاتيح localStorage المعروفة');
    } catch (e) {
      showError(e instanceof Error ? e : new Error('فشل المسح'));
    }
  };

  return (
    <RolePageShell>
      <PageHeader
        title="إدارة Cache"
        subtitle="عمليات حذرة للمطور — لا مسح خادم عام من الواجهة"
        icon={RefreshCw}
      />

      <HorizonCard className="mb-4 border border-amber-500/25">
        <p className="text-sm text-amber-100/90 leading-relaxed">
          لا يوجد flush لكاش Supabase/CDN من هنا. هذه الأدوات تقتصر على جلسة المتصفح الحالية.
        </p>
      </HorizonCard>

      <div className="grid sm:grid-cols-2 gap-3">
        <HorizonCard className="!p-4">
          <p className="text-sm font-semibold text-white mb-2">React Query</p>
          <p className="text-xs text-surface-muted mb-3">مسح كل الاستعلامات المخزّنة في الذاكرة لهذه التبويبة.</p>
          <Button size="sm" variant="secondary" onClick={clearReactQuery}>
            مسح كاش الاستعلامات
          </Button>
        </HorizonCard>

        <HorizonCard className="!p-4">
          <p className="text-sm font-semibold text-white mb-2">localStorage معروف</p>
          <p className="text-xs text-surface-muted mb-3">
            مفاتيح: {KNOWN_LOCAL_KEYS.join(', ')}
          </p>
          <Button size="sm" variant="secondary" onClick={clearLocal}>
            {confirm ? 'تأكيد المسح' : 'مسح المفاتيح المعروفة'}
          </Button>
          {confirm && (
            <button
              type="button"
              className="block mt-2 text-xs text-white/40 underline"
              onClick={() => setConfirm(false)}
            >
              إلغاء
            </button>
          )}
        </HorizonCard>
      </div>
    </RolePageShell>
  );
}
