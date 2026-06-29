import clsx from 'clsx';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return <div className={clsx('skeleton-shimmer', className)} aria-hidden="true" />;
}

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="glass-card p-6 space-y-3" aria-busy="true" aria-label="جاري التحميل">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-3">
          {Array.from({ length: columns }).map((_, col) => (
            <Skeleton
              key={col}
              className={clsx('h-10 flex-1 rounded-xl', col === 0 && 'max-w-[200px]')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type CardSkeletonProps = {
  count?: number;
};

export function CardSkeleton({ count = 4 }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}
