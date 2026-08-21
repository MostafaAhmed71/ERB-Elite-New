import { ThumbsUp, AlertCircle, BarChart3 } from 'lucide-react';
import type { TeacherEvalReport } from '../../lib/teacherEvaluation/types';
import { monthLabelAr } from '../../lib/teacherEvaluation/scoring';

export function TeacherEvalReportPanel({ report }: { report: TeacherEvalReport }) {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 text-center">
          <p className="text-[#A3AED0] text-xs">الدرجة النهائية</p>
          <p className="text-white text-2xl font-bold mt-1">{report.finalScore.toFixed(1)}</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 text-center">
          <p className="text-[#A3AED0] text-xs">الترتيب</p>
          <p className="text-white text-2xl font-bold mt-1">#{report.rank}</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 text-center">
          <p className="text-[#A3AED0] text-xs">الخصومات</p>
          <p className="text-rose-300 text-2xl font-bold mt-1">{report.totalDeductions.toFixed(1)}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#01B574]/20 bg-[#01B574]/5 p-4">
          <h4 className="text-[#01B574] font-semibold text-sm flex items-center gap-2 mb-3">
            <ThumbsUp className="w-4 h-4" /> نقاط القوة
          </h4>
          {report.strengths.length ? (
            <ul className="space-y-1.5 text-sm text-white/90">
              {report.strengths.map((s) => (
                <li key={s.title}>
                  {s.title} — <span className="text-[#01B574]">{s.score.toFixed(1)}/{s.max}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[#A3AED0] text-sm">لا بيانات كافية بعد</p>
          )}
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h4 className="text-amber-300 font-semibold text-sm flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4" /> يحتاج تحسين
          </h4>
          {report.improvements.length ? (
            <ul className="space-y-1.5 text-sm text-white/90">
              {report.improvements.map((s) => (
                <li key={s.title}>
                  {s.title} — <span className="text-amber-300">{s.score.toFixed(1)}/{s.max}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[#A3AED0] text-sm">أداء متوازن</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="px-4 py-2.5 bg-white/[0.04] border-b border-white/[0.06] flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#7551FF]" />
          <span className="text-white font-semibold text-sm">تفصيل البنود</span>
        </div>
        <div className="max-h-[280px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-[#A3AED0] text-xs">
              <tr>
                <th className="p-2 text-right">البند</th>
                <th className="p-2 text-right">المحور</th>
                <th className="p-2 text-center">الدرجة</th>
                <th className="p-2 text-center">%</th>
              </tr>
            </thead>
            <tbody>
              {report.criterionBreakdown.map((c) => (
                <tr key={c.criterionId} className="border-t border-white/[0.04]">
                  <td className="p-2 text-white">{c.title}</td>
                  <td className="p-2 text-[#A3AED0] text-xs">{c.axisTitle}</td>
                  <td className="p-2 text-center text-white">
                    {c.avgScore.toFixed(1)}/{c.maxPoints}
                  </td>
                  <td className="p-2 text-center">
                    <span
                      className={
                        c.percent >= 75
                          ? 'text-[#01B574]'
                          : c.percent >= 50
                            ? 'text-gold-300'
                            : 'text-rose-300'
                      }
                    >
                      {c.percent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {report.monthlyHistory.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] p-4">
          <h4 className="text-white font-semibold text-sm mb-3">السجل التراكمي (أشهر سابقة)</h4>
          <ul className="space-y-2">
            {report.monthlyHistory.map((h) => (
              <li
                key={`${h.year}-${h.month}`}
                className="flex justify-between text-sm text-[#A3AED0] border-b border-white/[0.04] pb-2"
              >
                <span>{monthLabelAr(h.year, h.month)}</span>
                <span className="text-white">
                  {h.finalScore.toFixed(1)} — #{h.rank}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
