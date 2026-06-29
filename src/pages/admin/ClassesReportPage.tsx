import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, School, Trophy, Users, TrendingUp, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { exportRowsToExcel } from '../../lib/exportExcel';
import { buildClassAxisReport, averagePerStudent, type ClassAxisRow } from '../../lib/classReport';
import { fetchApprovedClassGrants } from '../../lib/classPoints';
import { mergeGradeLists } from '../../lib/schoolClasses';
import { useGradeClassCatalog } from '../../hooks/useGradeClassCatalog';
import { useAuthStore } from '../../stores/authStore';
import { buildClassExamReport, type ClassExamRow } from '../../lib/supervisorInsights';
import {
  KpiCard,
  MiniProgressBar,
  RankPill,
  AXIS_CHART_COLORS,
} from '../../components/analytics/AnalyticsPrimitives';
import {
  ClassAxisStackChart,
  ClassWeightedBarChart,
  SchoolAxisRadarChart,
} from '../../components/analytics/ClassPerformanceCharts';
import { TermComparisonPanel } from '../../components/admin/TermComparisonPanel';
import { ClassActivityAnalysisPanel } from '../../components/admin/ClassActivityAnalysisPanel';
import clsx from 'clsx';

export function ClassesReportPage() {
  const [gradeFilter, setGradeFilter] = useState('');
  const [reportView, setReportView] = useState<'standard' | 'terms' | 'activities'>('standard');
  const { data: catalog } = useGradeClassCatalog();
  const { role } = useAuthStore();
  const useExamReport = role === 'supervisor' || role === 'principal';

  const { data: pointsRows = [], isLoading: pointsLoading } = useQuery({
    queryKey: ['admin', 'classes-report', 'points'],
    queryFn: async () => {
      const [ledgerRes, classGrants] = await Promise.all([
        supabase
          .from('points_ledger')
          .select(`
          student_id, points, status, activity_id,
          activities (category),
          students:student_id (grade, class_name, full_name)
        `)
          .eq('status', 'approved'),
        fetchApprovedClassGrants(),
      ]);
      const { data, error } = ledgerRes;
      if (error) throw error;
      return buildClassAxisReport(
        (data ?? []) as unknown as Parameters<typeof buildClassAxisReport>[0],
        classGrants
      );
    },
    enabled: !useExamReport,
  });

  const { data: examRows = [], isLoading: examLoading } = useQuery({
    queryKey: ['admin', 'classes-report', 'exams'],
    queryFn: async () => {
      const [studentsRes, resultsRes] = await Promise.all([
        supabase.from('students').select('id, grade, class_name').eq('is_active', true),
        supabase.from('exam_results').select('student_id, score, max_score'),
      ]);
      if (studentsRes.error) throw studentsRes.error;
      if (resultsRes.error) throw resultsRes.error;
      return buildClassExamReport(studentsRes.data ?? [], resultsRes.data ?? []);
    },
    enabled: useExamReport,
  });

  const rows = useExamReport ? examRows.filter((r) => r.resultCount > 0) : pointsRows;
  const isLoading = useExamReport ? examLoading : pointsLoading;

  const grades = useMemo(
    () => mergeGradeLists(catalog?.grades, rows.map((r) => r.grade)),
    [catalog?.grades, rows]
  );

  const filtered = useMemo(
    () => (gradeFilter ? rows.filter((r) => r.grade === gradeFilter) : rows),
    [rows, gradeFilter]
  );

  const pointsFiltered = filtered as ClassAxisRow[];

  const stats = useMemo(() => {
    if (useExamReport || pointsFiltered.length === 0) {
      const exam = filtered as ClassExamRow[];
      const top = [...exam].sort((a, b) => b.avgPct - a.avgPct)[0];
      const students = exam.reduce((s, r) => s + r.studentCount, 0);
      const avg =
        exam.length > 0
          ? Math.round(exam.reduce((s, r) => s + r.avgPct, 0) / exam.length)
          : 0;
      return {
        classes: exam.length,
        students,
        topLabel: top ? `فصل ${top.class_name}` : '—',
        topValue: top ? `${top.avgPct}%` : '—',
        avgLabel: 'متوسط الاختبارات',
        avgValue: `${avg}%`,
      };
    }

    const sorted = [...pointsFiltered].sort(
      (a, b) => averagePerStudent(b, 'weighted') - averagePerStudent(a, 'weighted')
    );
    const top = sorted[0];
    const students = pointsFiltered.reduce((s, r) => s + r.studentCount, 0);
    const avgWeighted = Math.round(
      pointsFiltered.reduce((s, r) => s + averagePerStudent(r, 'weighted'), 0) /
        pointsFiltered.length
    );
    return {
      classes: pointsFiltered.length,
      students,
      topLabel: top ? `فصل ${top.class_name}` : '—',
      topValue: top ? String(averagePerStudent(top, 'weighted')) : '—',
      avgLabel: 'متوسط موزون',
      avgValue: String(avgWeighted),
    };
  }, [filtered, pointsFiltered, useExamReport]);

  const maxWeighted = useMemo(() => {
    if (useExamReport) return 100;
    return Math.max(...pointsFiltered.map((r) => averagePerStudent(r, 'weighted')), 1);
  }, [pointsFiltered, useExamReport]);

  const handleExport = () => {
    if (useExamReport) {
      exportRowsToExcel(
        (filtered as ClassExamRow[]).map((r) => ({
          الصف: r.grade,
          الفصل: r.class_name,
          الطلاب: r.studentCount,
          اختبروا: r.studentsTested,
          'متوسط %': r.avgPct,
          'نسبة النجاح %': r.passRate,
          'عدد النتائج': r.resultCount,
        })),
        'الفصول',
        `تقرير-اختبارات-الفصول-${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      return;
    }
    exportRowsToExcel(
      (filtered as ClassAxisRow[]).map((r) => ({
        الصف: r.grade,
        الفصل: r.class_name,
        الطلاب: r.studentCount,
        'نشاط (متوسط)': averagePerStudent(r, 'activity'),
        'سلوك (متوسط)': averagePerStudent(r, 'behavior'),
        'إنجاز (متوسط)': averagePerStudent(r, 'achievement'),
        'مبادرة (متوسط)': averagePerStudent(r, 'initiative'),
        'موزون (متوسط)': averagePerStudent(r, 'weighted'),
        'عمليات المنح': r.grantCount,
      })),
      'الفصول',
      `تقرير-الفصول-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="تقارير أداء الفصول"
        subtitle={
          useExamReport
            ? 'تحليل احترافي لنتائج الاختبارات ومقارنة الفصول'
            : 'تحليل المحاور الأربعة للتميز — إحصائيات ورسوم بيانية تفاعلية'
        }
        icon={BarChart3}
        variant="hero"
        badge={filtered.length > 0 ? `${filtered.length} فصل` : undefined}
        guidePath="/admin/classes-report"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {!useExamReport && (
            <>
              <button
                type="button"
                onClick={() => setReportView('standard')}
                className={clsx(
                  'px-3 py-2 rounded-xl text-xs border transition-all',
                  reportView === 'standard'
                    ? 'bg-gold-500/15 border-gold-400/40 text-gold-300'
                    : 'bg-white/5 border-white/10 text-white/50',
                )}
              >
                المحاور
              </button>
              <button
                type="button"
                onClick={() => setReportView('terms')}
                className={clsx(
                  'px-3 py-2 rounded-xl text-xs border transition-all',
                  reportView === 'terms'
                    ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-white/50',
                )}
              >
                مقارنة الفصول الدراسية
              </button>
              <button
                type="button"
                onClick={() => setReportView('activities')}
                className={clsx(
                  'px-3 py-2 rounded-xl text-xs border transition-all',
                  reportView === 'activities'
                    ? 'bg-blue-500/15 border-blue-400/40 text-blue-300'
                    : 'bg-white/5 border-white/10 text-white/50',
                )}
              >
                تحليل الفعاليات
              </button>
            </>
          )}
          <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#111c44] px-4 py-2.5 text-sm text-white appearance-none focus:border-gold-400/40 focus:outline-none"
        >
          <option value="" className="bg-navy-950">
            كل الصفوف
          </option>
          {grades.map((g) => (
            <option key={g} value={g} className="bg-navy-950">
              {g}
            </option>
          ))}
        </select>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="w-4 h-4" />
          تصدير Excel
        </Button>
      </div>

      {!useExamReport && reportView === 'terms' ? (
        <TermComparisonPanel gradeFilter={gradeFilter} />
      ) : !useExamReport && reportView === 'activities' ? (
        <ClassActivityAnalysisPanel />
      ) : isLoading ? (
        <TapHandLoader label="جاري تحميل التقارير..." fullScreen />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="لا توجد بيانات فصول"
          description={
            useExamReport
              ? 'ستظهر المقارنة بعد إجراء الاختبارات وتسليم النتائج'
              : 'ستظهر المقارنة بعد اعتماد نقاط للطلاب'
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="عدد الفصول" value={stats.classes} icon={School} accent="blue" delay={0} />
            <KpiCard label="إجمالي الطلاب" value={stats.students.toLocaleString('ar-SA')} icon={Users} accent="emerald" delay={0.05} />
            <KpiCard label="الفصل الأعلى" value={stats.topValue} hint={stats.topLabel} icon={Trophy} accent="gold" delay={0.1} />
            <KpiCard label={stats.avgLabel} value={stats.avgValue} icon={TrendingUp} accent="purple" delay={0.15} />
          </div>

          {!useExamReport && (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <ClassWeightedBarChart rows={pointsFiltered} />
              <SchoolAxisRadarChart rows={pointsFiltered} />
              <div className="xl:col-span-2">
                <ClassAxisStackChart rows={pointsFiltered} />
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#111c44] shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Layers className="h-4 w-4 text-gold-400" />
                  الجدول التفصيلي للفصول
                </h3>
                <p className="mt-1 text-[11px] text-white/40">ترتيب كامل مع مؤشرات بصرية لكل محور</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-white/45">
                    <th className="px-4 py-3 text-right font-medium">#</th>
                    <th className="px-4 py-3 text-right font-medium">الفصل</th>
                    <th className="px-4 py-3 text-right font-medium">الطلاب</th>
                    {useExamReport ? (
                      <>
                        <th className="px-4 py-3 text-right font-medium">متوسط %</th>
                        <th className="px-4 py-3 text-right font-medium">نجاح %</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-right font-medium">موزون ⌀</th>
                        <th className="px-4 py-3 text-right font-medium">المحاور</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(useExamReport ? (filtered as ClassExamRow[]) : [...pointsFiltered].sort((a, b) => averagePerStudent(b, 'weighted') - averagePerStudent(a, 'weighted'))).map((row, index) => {
                    if (useExamReport) {
                      const r = row as ClassExamRow;
                      return (
                        <tr key={r.key} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="px-4 py-3"><RankPill rank={index + 1} /></td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-white">فصل {r.class_name}</p>
                            <p className="text-[11px] text-white/40">{r.grade}</p>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-white/70">{r.studentCount}</td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-gold-400 tabular-nums">{r.avgPct}%</p>
                            <MiniProgressBar value={r.avgPct} max={100} color={AXIS_CHART_COLORS.exam} />
                          </td>
                          <td className="px-4 py-3 tabular-nums text-emerald-300">{r.passRate}%</td>
                        </tr>
                      );
                    }

                    const r = row as ClassAxisRow;
                    const weighted = averagePerStudent(r, 'weighted');
                    return (
                      <tr key={r.key} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-3"><RankPill rank={index + 1} /></td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">فصل {r.class_name}</p>
                          <p className="text-[11px] text-white/40">{r.grade}</p>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-white/70">{r.studentCount}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gold-400 tabular-nums">{weighted}</p>
                          <MiniProgressBar value={weighted} max={maxWeighted} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-1.5 min-w-[140px]">
                            {(['activity', 'behavior', 'achievement', 'initiative'] as const).map((axis) => (
                              <div key={axis} className="rounded-lg bg-white/[0.03] px-2 py-1 text-center">
                                <p className="text-[9px] text-white/35">
                                  {axis === 'activity' ? 'نشاط' : axis === 'behavior' ? 'سلوك' : axis === 'achievement' ? 'إنجاز' : 'مبادرة'}
                                </p>
                                <p className="text-xs font-bold tabular-nums" style={{ color: AXIS_CHART_COLORS[axis] }}>
                                  {averagePerStudent(r, axis)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
