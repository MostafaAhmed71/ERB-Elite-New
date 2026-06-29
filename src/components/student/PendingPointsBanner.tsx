import { Clock } from 'lucide-react';

type Props = {
  count: number;
  sum: number;
};

export function PendingPointsBanner({ count, sum }: Props) {
  if (count === 0) return null;

  return (
    <div
      className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-100"
      dir="rtl"
    >
      <Clock className="w-5 h-5 text-amber-400 shrink-0" />
      <div className="text-sm">
        <p className="font-medium">
          لديك {count} عملية رصد ({sum > 0 ? `+${sum}` : sum} نقطة) بانتظار موافقة رائد النشاط
        </p>
        <p className="text-amber-200/60 text-xs mt-0.5">ستظهر في رصيدك فور الاعتماد</p>
      </div>
    </div>
  );
}
