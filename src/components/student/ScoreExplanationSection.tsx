import { useState } from 'react';
import { ChevronDown, Calculator } from 'lucide-react';
import clsx from 'clsx';

const AXIS_ROWS = [
  { label: 'النشاط', key: 'activity' },
  { label: 'السلوك', key: 'behavior' },
  { label: 'الإنجاز', key: 'achievement' },
  { label: 'المبادرة', key: 'initiative' },
  { label: 'الحضور', key: 'attendance', note: 'نقاط الحضور المعتمدة من سجل النقاط' },
] as const;

export function ScoreExplanationSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card overflow-hidden" dir="rtl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 p-5 text-right hover:bg-white/3 transition-colors"
      >
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Calculator className="w-4 h-4 text-gold-400" />
          كيف حُسبت درجتي؟
        </h3>
        <ChevronDown className={clsx('w-4 h-4 text-white/40 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
          <p className="text-white/50 text-xs leading-relaxed">
            إجمالي نقاطك = مجموع كل النقاط المعتمدة في سجل التميز. فقط العمليات التي اعتمدها رائد النشاط تدخل في رصيدك.
          </p>
          <p className="text-white/50 text-xs leading-relaxed">
            يمكنك أيضاً متابعة نقاطك حسب المحاور (نشاط، سلوك، إنجاز، مبادرة، حضور) — كل محور يعرض مجموع النقاط المعتمدة فيه.
          </p>
          <div className="space-y-1.5">
            {AXIS_ROWS.map((row) => (
              <div key={row.key} className="flex items-center gap-2 text-xs">
                <span className="text-white/70 w-16">{row.label}</span>
                <span className="text-white/40">نقاط معتمدة في هذا المحور</span>
              </div>
            ))}
          </div>
          {AXIS_ROWS.filter((r) => 'note' in r).map((r) => (
            <p key={r.key} className="text-[10px] text-white/30">• {r.label}: {r.note}</p>
          ))}
          <p className="text-[10px] text-white/30">
            نسبة الحضور تُعرض بشكل منفصل ولا تُضاف تلقائياً إلى إجمالي النقاط إلا إذا منحك المعلم نقاط حضور معتمدة.
          </p>
        </div>
      )}
    </div>
  );
}
