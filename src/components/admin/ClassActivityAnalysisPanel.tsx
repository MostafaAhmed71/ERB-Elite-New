import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import clsx from 'clsx';
import { fetchClassActivityAnalysis } from '../../lib/classActivityAnalysis';
import { TapHandLoader } from '../ui/TapHandLoader';

export function ClassActivityAnalysisPanel() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['class-activity-analysis'],
    queryFn: () => fetchClassActivityAnalysis(30),
  });

  if (isLoading) {
    return <TapHandLoader label="جاري تحليل فعاليات الفصول..." />;
  }

  if (rows.length === 0) {
    return (
      <p className="text-white/30 text-sm text-center py-8">لا توجد بيانات أنشطة خلال آخر 30 يوماً</p>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-blue-400" />
        <div>
          <h3 className="text-white font-semibold text-base">تحليل فعاليات الفصول — AL9</h3>
          <p className="text-white/40 text-xs">مشاركة الفصول في الأنشطة خلال آخر 30 يوماً</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/5 text-white/50">
              <th className="text-right p-3 font-medium">الفصل</th>
              <th className="text-right p-3 font-medium">المشاركة</th>
              <th className="text-right p-3 font-medium">العمليات</th>
              <th className="text-right p-3 font-medium">أقوى محور</th>
              <th className="text-right p-3 font-medium">أكثر نشاطاً</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.classKey} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="p-3 text-white font-medium">{row.label}</td>
                <td className="p-3">
                  <span
                    className={clsx(
                      'font-mono font-bold',
                      row.participationPct >= 70 && 'text-emerald-400',
                      row.participationPct >= 40 && row.participationPct < 70 && 'text-amber-400',
                      row.participationPct < 40 && 'text-red-400',
                    )}
                  >
                    {row.participationPct}%
                  </span>
                  <span className="text-white/30 mr-1">
                    ({row.activeStudents}/{row.studentCount})
                  </span>
                </td>
                <td className="p-3 text-white/60 font-mono">{row.totalGrants}</td>
                <td className="p-3 text-white/70">
                  {row.topCategory}
                  <span className="text-white/30 mr-1">({row.topCategoryPoints} ن)</span>
                </td>
                <td className="p-3 text-white/60 max-w-[140px] truncate">{row.topActivity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
