import { KeyRound } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';

const MATRIX: { capability: string; school: string; developer: string }[] = [
  { capability: 'منح نقاط / اعتماد', school: 'نعم (أدوار مدرسية)', developer: 'لا' },
  { capability: 'إدارة طلاب وفصول', school: 'نعم', developer: 'لا' },
  { capability: 'بنك أسئلة / اختبارات', school: 'مشرف', developer: 'مراقبة فقط' },
  { capability: 'Jobs / Queue / Retry', school: 'لا', developer: 'نعم' },
  { capability: 'Error Center التفصيلي', school: 'ملخص لاحقاً', developer: 'نعم' },
  { capability: 'RAG rebuild / Reindex', school: 'رفع تربوي', developer: 'نعم تقني' },
  { capability: 'AI Usage التفصيلي', school: 'ملخص رصيد', developer: 'نعم' },
  { capability: 'Audit الكامل', school: 'عرض مبسط', developer: 'نعم' },
  { capability: 'Feature Flags النظام', school: 'إخفاء ميزات برنامج', developer: 'نعم + أعلام نظام' },
  { capability: 'DB Explorer', school: 'لا', developer: 'قراءة فقط' },
  { capability: 'Sandbox / Debug', school: 'لا', developer: 'نعم' },
  { capability: 'Supabase Dashboard / DDL', school: 'لا', developer: 'خارج الواجهة فقط' },
];

export function DevPermissionsPage() {
  return (
    <RolePageShell>
      <PageHeader
        title="مصفوفة الصلاحيات التقنية"
        subtitle="عرض مرجعي — المدير ≠ المطور"
        icon={KeyRound}
      />

      <HorizonCard className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-surface-muted text-xs">
              <th className="text-start py-2 px-2 font-medium">القدرة</th>
              <th className="text-start py-2 px-2 font-medium">المدرسة</th>
              <th className="text-start py-2 px-2 font-medium">مطور المنصة</th>
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((row) => (
              <tr key={row.capability} className="border-b border-white/5">
                <td className="py-2.5 px-2 text-white/90">{row.capability}</td>
                <td className="py-2.5 px-2 text-white/60 text-xs">{row.school}</td>
                <td className="py-2.5 px-2 text-emerald-300/90 text-xs">{row.developer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </HorizonCard>
    </RolePageShell>
  );
}
