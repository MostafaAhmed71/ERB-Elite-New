import { useMemo, useRef, useState, type ReactNode } from 'react';

type VirtualizedListProps<T> = {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  /** تحت هذا العدد لا حاجة للـ windowing */
  threshold?: number;
  gap?: number;
};

/** V — قائمة افتراضية خفيفة بدون مكتبات إضافية */
export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  keyExtractor,
  className,
  threshold = 40,
  gap = 0,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const row = itemHeight + gap;

  const useVirtual = items.length > threshold;

  const { start, end, offsetY, totalHeight } = useMemo(() => {
    if (!useVirtual) {
      return { start: 0, end: items.length, offsetY: 0, totalHeight: items.length * row };
    }
    const visible = Math.ceil(height / row) + 4;
    const startIdx = Math.max(0, Math.floor(scrollTop / row) - 2);
    const endIdx = Math.min(items.length, startIdx + visible);
    return {
      start: startIdx,
      end: endIdx,
      offsetY: startIdx * row,
      totalHeight: items.length * row,
    };
  }, [useVirtual, items.length, height, row, scrollTop]);

  if (!useVirtual) {
    return (
      <div className={className} style={{ maxHeight: height, overflow: 'auto' }}>
        {items.map((item, i) => (
          <div key={keyExtractor(item, i)} style={{ marginBottom: gap || undefined }}>
            {renderItem(item, i)}
          </div>
        ))}
      </div>
    );
  }

  const slice = items.slice(start, end);

  return (
    <div
      ref={ref}
      className={className}
      style={{ height, overflow: 'auto' }}
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {slice.map((item, i) => {
            const index = start + i;
            return (
              <div
                key={keyExtractor(item, index)}
                style={{ height: itemHeight, marginBottom: gap || undefined, boxSizing: 'border-box' }}
              >
                {renderItem(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
