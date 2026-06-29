import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Search, Printer, Calendar, Award, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BarsLoader } from '../ui/BarsLoader';
import clsx from 'clsx';
import { ScreenGuideButton } from './ScreenGuideButton';
import { embedOne } from '../../lib/supabaseEmbeds';
import { PLATFORM_NAME } from '../../lib/branding';

export function Reports() {
  const [reportType, setReportType] = useState('all'); // 'all' | 'weekly' | 'monthly' | 'custom'
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default last 30 days
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Query stats and logs inside date range
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['admin', 'reports', reportType, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('points_ledger')
        .select(`
          id,
          points,
          status,
          created_at,
          note,
          activities (
            name,
            category
          ),
          students:student_id (
            full_name,
            grade,
            class_name
          ),
          teachers:granted_by (
            full_name
          )
        `)
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`);

      const { data, error } = await query;
      if (error) throw error;

      const ledger = data || [];

      // Calculate indicators
      const totalEntries = ledger.length;
      const approvedCount = ledger.filter(item => item.status === 'approved').length;
      const pendingCount = ledger.filter(item => item.status === 'pending').length;
      const rejectedCount = ledger.filter(item => item.status === 'rejected').length;

      const totalApprovedPoints = ledger
        .filter(item => item.status === 'approved')
        .reduce((sum, item) => sum + item.points, 0);

      // Axis breakdown
      let activityPoints = 0;
      let behaviorPoints = 0;
      let achievementPoints = 0;
      let initiativePoints = 0;

      ledger.filter(item => item.status === 'approved').forEach(item => {
        const cat = embedOne(item.activities)?.category || 'activity';
        if (cat === 'activity') activityPoints += item.points;
        else if (cat === 'behavior') behaviorPoints += item.points;
        else if (cat === 'achievement') achievementPoints += item.points;
        else if (cat === 'initiative') initiativePoints += item.points;
      });

      // Last 50 entries
      const last50 = [...ledger]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50);

      return {
        totalEntries,
        approvedCount,
        pendingCount,
        rejectedCount,
        totalApprovedPoints,
        axisBreakdown: {
          activity: activityPoints,
          behavior: behaviorPoints,
          achievement: achievementPoints,
          initiative: initiativePoints,
        },
        last50,
      };
    },
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-white" dir="rtl">
      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background-color: white !important;
            color: black !important;
          }
          #print-report, #print-report * {
            visibility: visible;
          }
          #print-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px !important;
            background-color: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header (Screen only) */}
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gold-400" />
            منصة التقارير المعتمدة
          </h1>
          <p className="text-white/40 text-sm mt-1">توليد تقارير رصد النقاط وأداء الطلاب والمحاور قابلة للطباعة</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ScreenGuideButton path="/admin/reports" />
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 rounded-xl font-bold text-sm hover:shadow-lg transition-all"
        >
          <Printer className="w-4 h-4" />
          طباعة التقرير الحالي
        </button>
        </div>
      </div>

      {/* Date Filters (Screen only) */}
      <div className="bg-navy-900/40 border border-white/5 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end no-print">
        <div className="space-y-1.5">
          <label className="text-white/60 text-xs">من تاريخ</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold-400/50 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-white/60 text-xs">إلى تاريخ</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold-400/50 text-xs"
          />
        </div>
        <div className="text-xs text-white/30 italic">
          يتم فلترة وحساب إحصائيات التقرير ديناميكياً داخل النطاق الزمني المحدد.
        </div>
      </div>

      {/* Report Container (Rendered on screen & Printable) */}
      <div id="print-report" className="space-y-6">
        {/* Report Header Title */}
        <div className="border-b border-black/10 pb-4 text-center md:text-right flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extrabold text-white print:text-black">تقرير {PLATFORM_NAME}</h2>
            <p className="text-white/40 print:text-black/60 text-xs mt-1">
              النطاق الزمني: من {new Date(startDate).toLocaleDateString('ar-EG')} إلى {new Date(endDate).toLocaleDateString('ar-EG')}
            </p>
          </div>
          <div className="text-[10px] text-white/30 print:text-black/40 font-mono">
            تاريخ التوليد: {new Date().toLocaleString('ar-EG')}
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 flex justify-center no-print">
            <BarsLoader label="جاري توليد التقرير..." />
          </div>
        ) : !reportData ? (
          <div className="text-center text-white/30 py-8 no-print">فشل تحميل التقرير</div>
        ) : (
          <>
            {/* Indicators Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-navy-900/30 border border-white/5 p-4 rounded-xl print:border-black/20 text-center">
                <p className="text-white/40 print:text-black/60 text-[10px] mb-1">إجمالي الحركات</p>
                <p className="text-2xl font-bold text-white print:text-black font-mono">{reportData.totalEntries}</p>
              </div>
              <div className="bg-navy-900/30 border border-white/5 p-4 rounded-xl print:border-black/20 text-center">
                <p className="text-white/40 print:text-black/60 text-[10px] mb-1">الإدخالات المقبولة</p>
                <p className="text-2xl font-bold text-emerald-400 print:text-black font-mono">{reportData.approvedCount}</p>
              </div>
              <div className="bg-navy-900/30 border border-white/5 p-4 rounded-xl print:border-black/20 text-center">
                <p className="text-white/40 print:text-black/60 text-[10px] mb-1">الإدخالات المعلقة</p>
                <p className="text-2xl font-bold text-amber-400 print:text-black font-mono">{reportData.pendingCount}</p>
              </div>
              <div className="bg-navy-900/30 border border-white/5 p-4 rounded-xl print:border-black/20 text-center">
                <p className="text-white/40 print:text-black/60 text-[10px] mb-1">النقاط المعتمدة</p>
                <p className="text-2xl font-bold text-gold-400 print:text-black font-mono">{reportData.totalApprovedPoints} ن</p>
              </div>
            </div>

            {/* Axis breakdown */}
            <div className="bg-navy-900/30 border border-white/5 p-5 rounded-xl print:border-black/20 space-y-3">
              <h3 className="text-white print:text-black font-bold text-sm flex items-center gap-2 border-b border-white/5 print:border-black/10 pb-2">
                <Award className="w-4 h-4 text-gold-400" />
                تحليل النقاط المعتمدة حسب المحاور الأربعة
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                <div className="space-y-1">
                  <p className="text-white/40 print:text-black/50 text-[10px]">النشاط (40%)</p>
                  <p className="text-lg font-bold text-blue-400 print:text-black">{reportData.axisBreakdown.activity} ن</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white/40 print:text-black/50 text-[10px]">السلوك (30%)</p>
                  <p className="text-lg font-bold text-emerald-400 print:text-black">{reportData.axisBreakdown.behavior} ن</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white/40 print:text-black/50 text-[10px]">الإنجاز (20%)</p>
                  <p className="text-lg font-bold text-purple-400 print:text-black">{reportData.axisBreakdown.achievement} ن</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white/40 print:text-black/50 text-[10px]">المبادرة (10%)</p>
                  <p className="text-lg font-bold text-amber-400 print:text-black">{reportData.axisBreakdown.initiative} n</p>
                </div>
              </div>
            </div>

            {/* Last 50 entries table */}
            <div className="space-y-2.5">
              <h3 className="text-white print:text-black font-bold text-sm">تفاصيل آخر 50 عملية رصد خلال الفترة</h3>
              <div className="border border-white/5 print:border-black/15 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-right text-white/70 print:text-black">
                  <thead className="bg-white/5 print:bg-slate-100 border-b border-white/5 print:border-black/10 text-white/40 print:text-black/80 font-bold">
                    <tr>
                      <th className="px-4 py-2.5">الطالب</th>
                      <th className="px-4 py-2.5">الفصل</th>
                      <th className="px-4 py-2.5">النشاط والمحور</th>
                      <th className="px-4 py-2.5">النقاط</th>
                      <th className="px-4 py-2.5">الحالة</th>
                      <th className="px-4 py-2.5">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-slate-200">
                    {reportData.last50.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-white/30">لا توجد عمليات رصد نقاط خلال الفترة المحددة</td>
                      </tr>
                    ) : (
                      reportData.last50.map(item => {
                        const student = embedOne(item.students);
                        const activity = embedOne(item.activities);
                        return (
                        <tr key={item.id} className="hover:bg-white/3 print:hover:bg-transparent">
                          <td className="px-4 py-2.5 font-semibold">{student?.full_name ?? '—'}</td>
                          <td className="px-4 py-2.5">{student?.grade} / {student?.class_name}</td>
                          <td className="px-4 py-2.5">
                            <div>
                              <p>{activity?.name ?? 'رصد مباشر'}</p>
                              <p className="text-[9px] text-white/30 print:text-black/40">المحور: {activity?.category}</p>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-bold font-mono text-gold-400 print:text-black">
                            {item.points > 0 ? `+${item.points}` : item.points}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={clsx(
                              'text-[9px] font-bold px-1.5 py-0.5 rounded border',
                              item.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 print:border-black print:text-black' :
                              item.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 print:border-black print:text-black' :
                              'bg-red-500/10 border-red-500/20 text-red-400 print:border-black print:text-black'
                            )}>
                              {item.status === 'approved' ? 'معتمد' : item.status === 'pending' ? 'معلق' : 'مرفوض'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[10px] text-white/40 print:text-black/60 font-mono">
                            {new Date(item.created_at).toLocaleDateString('ar-EG')}
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
