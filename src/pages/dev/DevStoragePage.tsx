import { useQuery } from '@tanstack/react-query';
import { HardDrive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import {
  formatBytes,
  KNOWN_BUCKET_LABELS,
  listKnownStorageBuckets,
} from '../../lib/platformFiles';

export function DevStoragePage() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['dev', 'storage', 'buckets'],
    queryFn: listKnownStorageBuckets,
    refetchInterval: 60_000,
    retry: false,
  });

  const totalObjects = data.reduce((s, b) => s + b.object_count, 0);

  return (
    <RolePageShell>
      <PageHeader
        title="مراقبة التخزين"
        subtitle="ملخص Buckets المعروفة — التفاصيل في مركز الملفات"
        icon={HardDrive}
      />

      {error ? (
        <HorizonCard className="border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-100">
            طبّق <code className="text-white/80">093</code> أو افتح{' '}
            <Link to="/dev/files" className="text-gold-400 underline">إدارة الملفات</Link>.
          </p>
        </HorizonCard>
      ) : isLoading ? (
        <TapHandLoader label="جاري قياس التخزين..." />
      ) : (
        <>
          <HorizonCard className="border border-white/8">
            <p className="text-xs text-surface-muted">إجمالي الكائنات (المعروفة)</p>
            <p className="text-3xl font-bold text-gold-400 tabular-nums mt-1">{totalObjects}</p>
            <p className="text-xs text-surface-muted mt-2">{data.length} buckets</p>
          </HorizonCard>

          <div className="grid sm:grid-cols-2 gap-3">
            {data.map((b) => (
              <HorizonCard key={b.id} className="border border-white/8">
                <p className="font-mono text-sm text-white">{b.id}</p>
                <p className="text-xs text-surface-muted mt-1">{KNOWN_BUCKET_LABELS[b.id] ?? b.name}</p>
                <p className="text-lg font-bold text-white mt-3 tabular-nums">{b.object_count}</p>
                <p className="text-[10px] text-surface-muted">حد الملف {formatBytes(b.file_size_limit)}</p>
              </HorizonCard>
            ))}
          </div>

          <Link to="/dev/files" className="text-sm text-gold-400 hover:underline">
            فتح مركز الملفات ←
          </Link>
        </>
      )}
    </RolePageShell>
  );
}
