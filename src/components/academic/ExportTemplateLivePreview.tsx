import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { TEMPLATE_PAGE_WIDTH, TEMPLATE_PAGE_HEIGHT } from '../../lib/academic/exportTemplates';

const ZOOM_LEVELS = [0.38, 0.48, 0.58, 0.68] as const;

type Props = {
  html: string;
  label?: string;
  onOpenFullscreen?: () => void;
};

export function ExportTemplateLivePreview({ html, label, onOpenFullscreen }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [zoomIdx, setZoomIdx] = useState(2);
  const scale = ZOOM_LEVELS[zoomIdx];

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  const frameW = Math.round(TEMPLATE_PAGE_WIDTH * scale);
  const frameH = Math.round(TEMPLATE_PAGE_HEIGHT * scale);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0b1437] flex flex-col overflow-hidden lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">معاينة حية — مطابقة للتصدير</p>
          {label && <p className="text-[#A3AED0] text-[11px] truncate">{label}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-40"
            disabled={zoomIdx <= 0}
            onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
            aria-label="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gold-400 font-bold tabular-nums w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-40"
            disabled={zoomIdx >= ZOOM_LEVELS.length - 1}
            onClick={() => setZoomIdx((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
            aria-label="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {onOpenFullscreen && (
            <button
              type="button"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white mr-1"
              onClick={onOpenFullscreen}
              aria-label="فتح في نافذة"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 flex justify-center items-start bg-[#060d24] min-h-[320px]">
        <div
          className="relative shadow-2xl shadow-black/40 rounded-sm overflow-hidden ring-1 ring-white/10 shrink-0"
          style={{ width: frameW, height: frameH }}
        >
          <iframe
            ref={iframeRef}
            title="معاينة القالب"
            className="absolute top-0 right-0 border-0 bg-white"
            style={{
              width: TEMPLATE_PAGE_WIDTH,
              height: TEMPLATE_PAGE_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: 'top right',
            }}
          />
        </div>
      </div>

      <p className="text-[10px] text-[#A3AED0]/80 text-center px-2 py-2 border-t border-white/[0.06] shrink-0">
        A4 — {TEMPLATE_PAGE_WIDTH}×{TEMPLATE_PAGE_HEIGHT}px · يتحدّث فوراً مع أي تعديل
      </p>
    </div>
  );
}

export function SettingsSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] group"
    >
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-2 text-white font-semibold text-sm select-none">
        {icon}
        <span className="flex-1">{title}</span>
        <span className="text-[#A3AED0] text-xs group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/[0.05]">{children}</div>
    </details>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = 'px',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <label className="block text-sm col-span-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[#A3AED0]">{label}</span>
        <span className="text-gold-400 font-bold tabular-nums text-xs">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-gold-500"
      />
    </label>
  );
}

export function NumField({
  label,
  value,
  onChange,
  min = 0,
  max = 800,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="text-[#A3AED0] mb-1 block text-xs">{label}</span>
      <input
        type="number"
        className={clsx(
          'w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2 text-white text-sm',
          'focus:outline-none focus:ring-2 focus:ring-gold-500/40 text-left dir-ltr',
        )}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function RectEditor({
  rect,
  onChange,
  showBottom = true,
}: {
  rect: { top: number; left: number; right: number; bottom?: number };
  onChange: (patch: Partial<{ top: number; left: number; right: number; bottom?: number }>) => void;
  showBottom?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <NumField label="أعلى" value={rect.top} onChange={(v) => onChange({ top: v })} max={400} />
      <NumField label="يسار" value={rect.left} onChange={(v) => onChange({ left: v })} max={200} />
      <NumField label="يمين" value={rect.right} onChange={(v) => onChange({ right: v })} max={200} />
      {showBottom && (
        <NumField label="أسفل" value={rect.bottom ?? 96} onChange={(v) => onChange({ bottom: v })} max={250} />
      )}
    </div>
  );
}
