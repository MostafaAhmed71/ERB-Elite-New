import clsx from 'clsx';
import { BarsLoader } from './BarsLoader';
import { EmptyState } from './EmptyState';
import type { LucideIcon } from 'lucide-react';

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
};

type DataTableBaseProps = {
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: { label: string; to?: string; onClick?: () => void };
  skeletonRows?: number;
  skeletonColumns?: number;
  className?: string;
};

type DataTableWithChildren = DataTableBaseProps & {
  children: React.ReactNode;
  columns?: never;
  data?: never;
  keyExtractor?: never;
};

type DataTableWithColumns<T> = DataTableBaseProps & {
  children?: never;
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
};

type DataTableProps<T = unknown> = DataTableWithChildren | DataTableWithColumns<T>;

export function DataTable<T = unknown>({
  loading,
  empty,
  emptyTitle = 'لا توجد نتائج',
  emptyDescription,
  emptyIcon,
  emptyAction,
  skeletonRows = 5,
  skeletonColumns = 4,
  children,
  className,
  columns,
  data,
  keyExtractor,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="glass-card p-8 flex justify-center" aria-busy="true" aria-label="جاري التحميل">
        <BarsLoader label="جاري التحميل..." />
      </div>
    );
  }

  if (empty) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const body =
    columns && data && keyExtractor ? (
      <table className="w-full text-sm">
        <thead className="bg-white/5 border-b border-white/5">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-right text-white/50 font-medium whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="hover:bg-white/[0.02] transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-white/80 whitespace-nowrap">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      children
    );

  return (
    <div className={clsx('glass-card overflow-hidden', className)}>
      <div className="table-scroll">{body}</div>
    </div>
  );
}
