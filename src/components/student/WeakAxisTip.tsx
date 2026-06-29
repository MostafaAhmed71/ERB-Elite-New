import { Lightbulb } from 'lucide-react';
import type { AxisBreakdown } from '../../lib/calculations';

const TIPS: Record<string, string> = {
  activity: 'ركّز على المشاركة في الأنشطة المدرسية هذا الأسبوع',
  behavior: 'اهتم بسلوكك داخل الفصل — المعلمون يرصدون التميز اليومي',
  achievement: 'حاول إبراز إنجازاتك الأكاديمية والمهارية',
  initiative: 'ابدأ بمبادرة — اقترح نشاطاً أو ساعد زملاءك',
  attendance: 'الالتزام بالحضور مهم — قد يمنحك المعلم نقاط حضور معتمدة',
};

type Props = {
  breakdown: AxisBreakdown;
};

export function WeakAxisTip({ breakdown }: Props) {
  const axes = [
    { key: 'activity', value: breakdown.activity },
    { key: 'behavior', value: breakdown.behavior },
    { key: 'achievement', value: breakdown.achievement },
    { key: 'initiative', value: breakdown.initiative },
  ];
  const weakest = axes.reduce((min, a) => (a.value < min.value ? a : min), axes[0]);

  if (weakest.value > 50) return null;

  return (
    <div className="glass-card p-4 flex items-start gap-3 border border-amber-500/15 bg-amber-500/5" dir="rtl">
      <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-amber-200 text-xs font-medium">نصيحة مخصصة</p>
        <p className="text-white/60 text-xs mt-1">{TIPS[weakest.key]}</p>
      </div>
    </div>
  );
}
