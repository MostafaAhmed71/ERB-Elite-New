import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, HardDrive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { HubTabs, type HubTabItem } from '../../components/ui/HubTabs';
import {
  formatBytes,
  KNOWN_BUCKET_LABELS,
  listKnownStorageBuckets,
  listPlatformFileIndex,
  listStorageObjectsReadonly,
} from '../../lib/platformFiles';
import clsx from 'clsx';

type Tab = 'buckets' | 'objects' | 'index';

const TABS: HubTabItem<Tab>[] = [
  { id: 'buckets', label: 'Buckets', icon: HardDrive },
  { id: 'objects', label: 'كائنات Storage', icon: FolderOpen },
  { id: 'index', label: 'الفهرس المسجّل', icon: FolderOpen },
];

export function DevFilesPage() {
  const [tab, setTab] = useState<Tab>('buckets');
  const [bucket, setBucket] = useState('school-media');

  const bucketsQuery = useQuery({
    queryKey: ['dev', 'files', 'buckets'],
    queryFn: listKnownStorageBuckets,
    retry: false,
  });

  const objectsQuery = useQuery({
    queryKey: ['dev', 'files', 'objects', bucket],
    queryFn: () => listStorageObjectsReadonly(bucket, 80),
    enabled: tab === 'objects',
    retry: false,
  });

  const indexQuery = useQuery({
    queryKey: ['dev', 'files', 'index', bucket],
    queryFn: () => listPlatformFileIndex({ bucket, limit: 80 }),
    enabled: tab === 'index',
    retry: false,
  });

  const missing =
    bucketsQuery.error?.message?.includes('list_known_storage_buckets')
    || bucketsQuery.error?.message?.includes('schema cache')
    || bucketsQuery.error?.message?.includes('function');

  return (
    <RolePageShell>
      <PageHeader
        title="إدارة الملفات"
        subtitle="وجه تقني — استعراض Buckets والكائنات (قراءة فقط)"
        icon={FolderOpen}
      />

      {missing && (
        <HorizonCard className="border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-100">
            طبّق migration <code className="text-white/80">093_platform_files_and_errors.sql</code> ثم أعد التحميل.
          </p>
        </HorizonCard>
      )}

      <HubTabs tabs={TABS} activeId={tab} onChange={setTab} ariaLabel="أقسام الملفات" />

      {(tab === 'objects' || tab === 'index') && (
        <div className="flex flex-wrap gap-2">
          {(bucketsQuery.data ?? Object.keys(KNOWN_BUCKET_LABELS)).map((b) => {
            const id = typeof b === 'string' ? b : b.id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setBucket(id)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                  bucket === id
                    ? 'bg-gold-500 text-navy-950 border-gold-500'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10',
                )}
              >
                {id}
              </button>
            );
          })}
        </div>
      )}

      {tab === 'buckets' && (
        bucketsQuery.isLoading ? (
          <TapHandLoader label="جاري تحميل الـ Buckets..." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {(bucketsQuery.data ?? []).map((b) => (
              <HorizonCard key={b.id} className="border border-white/8">
                <p className="text-sm font-bold text-white font-mono">{b.id}</p>
                <p className="text-xs text-surface-muted mt-1">
                  {KNOWN_BUCKET_LABELS[b.id] ?? b.name}
                </p>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-surface-muted">
                  <span>{b.public ? 'عام' : 'خاص'}</span>
                  <span>{b.object_count} ملف</span>
                  <span>حد {formatBytes(b.file_size_limit)}</span>
                </div>
                <button
                  type="button"
                  className="mt-3 text-xs text-gold-400 hover:underline"
                  onClick={() => {
                    setBucket(b.id);
                    setTab('objects');
                  }}
                >
                  استعراض الكائنات
                </button>
              </HorizonCard>
            ))}
            {!missing && (bucketsQuery.data ?? []).length === 0 && (
              <p className="text-sm text-surface-muted">لا Buckets معروفة</p>
            )}
          </div>
        )
      )}

      {tab === 'objects' && (
        objectsQuery.isLoading ? (
          <TapHandLoader label="جاري قراءة الكائنات..." />
        ) : objectsQuery.error ? (
          <HorizonCard className="border border-red-500/25 bg-red-500/10">
            <p className="text-sm text-red-200">{objectsQuery.error.message}</p>
          </HorizonCard>
        ) : (
          <HorizonCard>
            <p className="text-xs text-surface-muted mb-3">
              bucket: <span className="text-white font-mono">{bucket}</span>
            </p>
            {(objectsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-surface-muted">لا كائنات أو لا صلاحية قراءة</p>
            ) : (
              <ul className="space-y-2 max-h-[480px] overflow-y-auto">
                {(objectsQuery.data ?? []).map((o) => (
                  <li
                    key={o.name}
                    className="flex items-start justify-between gap-2 text-sm border-b border-white/5 pb-2"
                  >
                    <span className="font-mono text-white/90 text-xs break-all">{o.name}</span>
                    <span className="text-[10px] text-surface-muted shrink-0">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString('ar-SA') : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </HorizonCard>
        )
      )}

      {tab === 'index' && (
        indexQuery.isLoading ? (
          <TapHandLoader label="جاري تحميل الفهرس..." />
        ) : indexQuery.error ? (
          <HorizonCard className="border border-amber-500/25 bg-amber-500/10">
            <p className="text-sm text-amber-100">
              الفهرس فارغ أو الجدول غير مطبّق. يمكن للرفعّات اللاحقة استدعاء{' '}
              <code className="text-white/70">register_platform_file</code>.
            </p>
          </HorizonCard>
        ) : (
          <HorizonCard>
            {(indexQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-surface-muted">
                لا سجلات مفهرسة بعد لـ {bucket}. راجع أيضاً{' '}
                <Link to="/dev/storage" className="text-gold-400 underline">مراقبة التخزين</Link>.
              </p>
            ) : (
              <ul className="space-y-2">
                {(indexQuery.data ?? []).map((f) => (
                  <li key={f.id} className="text-sm border-b border-white/5 pb-2">
                    <p className="text-white font-medium">{f.file_name ?? f.object_path}</p>
                    <p className="text-[10px] text-surface-muted font-mono mt-0.5">
                      {f.bucket_id}/{f.object_path}
                    </p>
                    <p className="text-[10px] text-surface-muted mt-0.5">
                      {f.source_module ?? '—'} · {formatBytes(f.size_bytes)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </HorizonCard>
        )
      )}
    </RolePageShell>
  );
}
