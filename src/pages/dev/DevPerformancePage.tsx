import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { isDevDebugModeEnabled } from './DevDebugModePage';

export function DevPerformancePage() {
  const [nav, setNav] = useState<{ dns?: number; ttfb?: number; load?: number }>({});
  const [mem, setMem] = useState<string>('—');

  useEffect(() => {
    try {
      const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const n = entries[0];
      if (n) {
        setNav({
          dns: Math.round(n.domainLookupEnd - n.domainLookupStart),
          ttfb: Math.round(n.responseStart - n.requestStart),
          load: Math.round(n.loadEventEnd - n.startTime),
        });
      }
      const perfMem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      if (perfMem?.usedJSHeapSize) {
        setMem(`${Math.round(perfMem.usedJSHeapSize / 1048576)} MB`);
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <RolePageShell>
      <PageHeader
        title="لوحة الأداء"
        subtitle="مقاييس مدركة من المتصفح — بدون أسرار"
        icon={Gauge}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          ['DNS', nav.dns != null ? `${nav.dns} ms` : '—'],
          ['TTFB', nav.ttfb != null ? `${nav.ttfb} ms` : '—'],
          ['Load', nav.load != null ? `${nav.load} ms` : '—'],
          ['JS Heap', mem],
        ].map(([label, value]) => (
          <HorizonCard key={String(label)} className="!p-4">
            <p className="text-[10px] text-surface-muted">{label}</p>
            <p className="text-xl font-bold text-white mt-1 tabular-nums">{value}</p>
          </HorizonCard>
        ))}
      </div>

      <HorizonCard>
        <p className="text-sm text-surface-muted leading-relaxed">
          Debug Mode: {isDevDebugModeEnabled() ? 'مفعّل' : 'معطّل'} — الطبقة العائمة تظهر عند التفعيل من /dev/debug.
        </p>
      </HorizonCard>
    </RolePageShell>
  );
}
