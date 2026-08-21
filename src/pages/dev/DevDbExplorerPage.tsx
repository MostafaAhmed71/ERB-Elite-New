import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Download, RefreshCw } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { exportPreviewCsv, listPublicTables, previewTable } from '../../lib/platformDevTools';
import { showError, showSuccess } from '../../lib/toast';
import clsx from 'clsx';

export function DevDbExplorerPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 40;

  const tablesQuery = useQuery({
    queryKey: ['dev', 'db', 'tables'],
    queryFn: listPublicTables,
    retry: false,
  });

  const previewQuery = useQuery({
    queryKey: ['dev', 'db', 'preview', selected, offset],
    queryFn: () => previewTable(selected!, { limit, offset }),
    enabled: !!selected,
    retry: false,
  });

  const tables = useMemo(() => {
    const all = tablesQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((t) => t.table_name.includes(q));
  }, [tablesQuery.data, search]);

  const columns = useMemo(() => {
    const row = previewQuery.data?.rows?.[0];
    return row ? Object.keys(row) : [];
  }, [previewQuery.data]);

  const missing =
    tablesQuery.error?.message?.includes('dev_list_public')
    || tablesQuery.error?.message?.includes('platform_developer');

  return (
    <RolePageShell>
      <PageHeader
        title="مستكشف قاعدة البيانات"
        subtitle="قراءة فقط — قائمة جداول · معاينة · CSV محدود · صفر كتابة"
        icon={Table}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              tablesQuery.refetch();
              if (selected) previewQuery.refetch();
            }}
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', tablesQuery.isFetching && 'animate-spin')} />
            تحديث
          </Button>
        }
      />

      {missing && (
        <HorizonCard className="border border-amber-500/30 mb-4">
          <p className="text-sm text-amber-200/90">
            طبّق migration <code className="text-xs">096_dev_tools_sandbox_db.sql</code>
          </p>
        </HorizonCard>
      )}

      <HorizonCard className="mb-4 border border-red-500/20">
        <p className="text-xs text-red-200/90 leading-relaxed">
          هذه الأداة للتشخيص فقط. ممنوع INSERT/UPDATE/DELETE/DDL من الواجهة. الحقول الحساسة تُقنَّع في العميل.
        </p>
      </HorizonCard>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث عن جدول..." />
          {tablesQuery.isLoading ? (
            <div className="flex justify-center py-10"><TapHandLoader /></div>
          ) : (
            <div className="space-y-1 max-h-[70vh] overflow-y-auto">
              {tables.map((t) => (
                <button
                  key={t.table_name}
                  type="button"
                  onClick={() => {
                    setSelected(t.table_name);
                    setOffset(0);
                  }}
                  className={clsx(
                    'w-full text-start px-3 py-2 rounded-xl border text-sm',
                    selected === t.table_name
                      ? 'border-gold-500/40 bg-gold-500/10 text-white'
                      : 'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.05]',
                  )}
                >
                  <span className="font-mono text-xs">{t.table_name}</span>
                  <span className="float-end text-[10px] text-surface-muted tabular-nums">
                    ~{t.estimated_rows}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          {!selected ? (
            <HorizonCard>
              <p className="text-sm text-surface-muted text-center py-16">اختر جدولاً للمعاينة</p>
            </HorizonCard>
          ) : previewQuery.isLoading ? (
            <div className="flex justify-center py-16"><TapHandLoader /></div>
          ) : previewQuery.error ? (
            <HorizonCard className="border border-red-500/30">
              <p className="text-sm text-red-300">{(previewQuery.error as Error).message}</p>
            </HorizonCard>
          ) : (
            <HorizonCard className="!p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
                <p className="text-sm text-white font-mono">
                  {selected}{' '}
                  <span className="text-surface-muted font-sans text-xs">
                    ({previewQuery.data?.total ?? 0} صف)
                  </span>
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!previewQuery.data?.rows.length}
                    onClick={() => {
                      try {
                        exportPreviewCsv(selected, previewQuery.data!.rows);
                        showSuccess('صُدّر CSV (عينة محدودة)');
                      } catch (e) {
                        showError(e instanceof Error ? e : new Error('فشل التصدير'));
                      }
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={offset === 0}
                    onClick={() => setOffset((o) => Math.max(0, o - limit))}
                  >
                    السابق
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={(previewQuery.data?.rows.length ?? 0) < limit}
                    onClick={() => setOffset((o) => o + limit)}
                  >
                    التالي
                  </Button>
                </div>
              </div>
              <div className="overflow-auto max-h-[65vh] rounded-xl border border-white/10">
                <table className="min-w-full text-[11px] text-white/80">
                  <thead className="bg-white/5 sticky top-0">
                    <tr>
                      {columns.map((c) => (
                        <th key={c} className="px-2 py-2 text-start font-medium whitespace-nowrap border-b border-white/10">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(previewQuery.data?.rows ?? []).map((row, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.03]">
                        {columns.map((c) => (
                          <td key={c} className="px-2 py-1.5 max-w-[220px] truncate font-mono">
                            {row[c] == null
                              ? '—'
                              : typeof row[c] === 'object'
                                ? JSON.stringify(row[c])
                                : String(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </HorizonCard>
          )}
        </div>
      </div>
    </RolePageShell>
  );
}
