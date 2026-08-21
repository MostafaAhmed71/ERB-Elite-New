import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Download,
  FileText,
  Users,
  ClipboardList,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { exportRowsToExcel } from '../../lib/exportExcel';
import { printHtmlReport } from '../../lib/exportPdf';
import { classifyExamWarnings, WARNING_COLORS } from '../../lib/earlyWarning';
import { fetchOperationalAlertData } from '../../lib/operationalAlerts';
import { printQuarterlyPrincipalReport } from '../../lib/quarterlyReport';
import { OperationalAlertCenter } from '../../components/shared/OperationalAlertCenter';
import { containerVariants } from '../../lib/motionVariants';
import { HorizonCard, HorizonIconBox, HorizonStatCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { StudentsGradeDistribution } from '../../components/dashboard/horizon/StudentsGradeDistribution';
import { WhatIfWeightsPanel } from '../../components/principal/WhatIfWeightsPanel';
import { PlatformAdoptionPanel } from '../../components/principal/PlatformAdoptionPanel';
import { SchoolOpsHealthCard } from '../../components/principal/SchoolOpsHealthCard';
import { PrincipalAiUsageSummaryCard } from '../../components/principal/PrincipalAiUsageSummaryCard';
import { DayCloseWeatherCard } from '../../components/dashboard/DayCloseWeatherCard';
import clsx from 'clsx';

export function PrincipalExecutivePage() {
  const { data: alertData } = useQuery({
    queryKey: ['operational-alerts'],
    queryFn: fetchOperationalAlertData,
    refetchInterval: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['principal', 'executive'],
    queryFn: async () => {
      const [studentsRes, examsRes] = await Promise.all([
        supabase.from('students').select('id, full_name, grade, class_name').eq('is_active', true),
        supabase.from('exam_results').select('student_id, score, max_score'),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (examsRes.error) throw examsRes.error;

      const students = studentsRes.data ?? [];
      const exams = examsRes.data ?? [];

      const gradesMap: Record<string, number> = {};
      students.forEach((s) => {
        gradesMap[s.grade] = (gradesMap[s.grade] ?? 0) + 1;
      });

      const passCount = exams.filter((e) => e.max_score > 0 && e.score / e.max_score >= 0.5).length;
      const examPassRate = exams.length > 0 ? Math.round((passCount / exams.length) * 100) : null;

      const warnings = classifyExamWarnings(students, exams);

      return {
        totalStudents: students.length,
        examPassRate,
        totalExams: exams.length,
        warnings,
        gradesChart: Object.entries(gradesMap).map(([name, count]) => ({ name, count })),
      };
    },
  });

  const kpiCards = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'إجمالي الطلاب', value: data.totalStudents, icon: Users, iconVariant: 'gradient' as const },
      {
        label: 'نجاح الاختبارات',
        value: data.examPassRate != null ? `${data.examPassRate}%` : '—',
        icon: ClipboardList,
        iconVariant: 'blue' as const,
      },
      { label: 'نتائج مسجّلة', value: data.totalExams, icon: LayoutDashboard, iconVariant: 'soft' as const },
      {
        label: 'إنذارات مبكرة',
        value: data.warnings.length,
        icon: AlertTriangle,
        iconVariant: 'gradient' as const,
      },
    ];
  }, [data]);

  const handleExportExcel = () => {
    if (!data) return;
    exportRowsToExcel(
      data.gradesChart.map((r) => ({ الصف: r.name, الطلاب: r.count })),
      'الطلاب',
      `طلاب-حسب-الصف-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const handleExportPdf = () => {
    if (!data) return;
    const rows = data.gradesChart.map((r) => `<tr><td>${r.name}</td><td>${r.count}</td></tr>`).join('');
    printHtmlReport(
      'لوحة مؤشرات المدرسة',
      `
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">الطلاب</div><div class="kpi-value">${data.totalStudents}</div></div>
        <div class="kpi"><div class="kpi-label">نجاح الاختبارات</div><div class="kpi-value">${data.examPassRate ?? '—'}%</div></div>
      </div>
      <h2>توزيع الطلاب حسب الصف</h2>
      <table><thead><tr><th>الصف</th><th>العدد</th></tr></thead><tbody>${rows}</tbody></table>
    `
    );
  };

  const handleQuarterlyReport = () => {
    if (!data || !alertData) return;
    void printQuarterlyPrincipalReport({
      totalStudents: data.totalStudents,
      examPassRate: data.examPassRate,
      totalExams: data.totalExams,
      warningCount: data.warnings.length,
      pendingInsights: alertData.pendingInsights,
      inactiveClasses: alertData.inactiveClasses,
      inactiveTeachers: alertData.inactiveTeachers,
      gradesChart: data.gradesChart,
    });
  };

  const warnings = data?.warnings ?? [];
  const gradesChart = data?.gradesChart ?? [];

  return (
    <div className="horizon-dashboard relative min-h-full" dir="rtl">
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-[24px]"
        style={{
          background:
            'radial-gradient(circle at 85% 0%, rgba(117,81,255,0.12) 0%, transparent 42%), radial-gradient(circle at 10% 20%, rgba(68,129,235,0.08) 0%, transparent 38%), linear-gradient(180deg, rgba(17,28,68,0.35) 0%, transparent 100%)',
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        <HorizonCard className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-35"
            style={{
              background:
                'radial-gradient(circle at 100% 0%, rgba(68,129,235,0.15) 0%, transparent 50%)',
            }}
          />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <HorizonIconBox icon={LayoutDashboard} variant="blue" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">لوحة التنفيذية</h1>
                <p className="text-sm font-medium text-[#A3AED0] mt-1">
                  مؤشرات الطلاب والاختبارات — النقاط من اختصاص رائد النشاط
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={gradesChart.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.06] text-[#A3AED0] border border-white/[0.06] hover:bg-white/[0.1] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
              <button
                type="button"
                onClick={handleQuarterlyReport}
                disabled={!data || !alertData}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                تقرير ربع سنوي
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!data}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#7551FF] to-[#422AFB] text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>
        </HorizonCard>

        {isLoading ? (
          <HorizonCard className="py-12 flex justify-center">
            <TapHandLoader label="جاري تحميل المؤشرات..." />
          </HorizonCard>
        ) : (
          <>
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5"
            >
              {kpiCards.map((card, i) => (
                <HorizonStatCard key={card.label} {...card} index={i} />
              ))}
            </motion.div>

            <StudentsGradeDistribution data={gradesChart} />

            <div className="grid lg:grid-cols-2 gap-4">
              <SchoolOpsHealthCard />
              <PrincipalAiUsageSummaryCard />
              <DayCloseWeatherCard />
            </div>

            <WhatIfWeightsPanel />

            <PlatformAdoptionPanel />

            {alertData && (
              <OperationalAlertCenter
                alerts={alertData.alerts}
                title="مركز التنبيهات التشغيلية"
                subtitle="متابعة الفصول والمعلمين وطلبات الاعتماد"
              />
            )}

            <HorizonCard>
              <div className="flex items-center gap-3 mb-5">
                <HorizonIconBox icon={AlertTriangle} variant="gradient" className="!w-12 !h-12" />
                <div>
                  <h3 className="text-lg font-bold text-white">
                    نظام الإنذار المبكر — أكاديمي
                  </h3>
                  <p className="text-sm font-medium text-[#A3AED0] mt-0.5">
                    {warnings.length} حالة تحتاج متابعة
                  </p>
                </div>
              </div>
              {warnings.length === 0 ? (
                <div className="text-center py-10 rounded-[16px] bg-white/[0.04] border border-white/[0.06]">
                  <p className="text-[#01B574] text-sm font-semibold">لا توجد حالات تحتاج متابعة حالياً</p>
                  <p className="text-[#A3AED0] text-xs mt-1">الأداء الأكاديمي ضمن المستوى المتوقع</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {warnings.map((w) => (
                    <Link
                      key={w.studentId}
                      to={`/principal/student/${w.studentId}`}
                      className={clsx(
                        'flex items-center justify-between p-4 rounded-[16px] border transition-all hover:bg-white/[0.06]',
                        WARNING_COLORS[w.level]
                      )}
                    >
                      <div>
                        <p className="font-bold text-sm text-white">{w.fullName}</p>
                        <p className="text-xs text-[#A3AED0] mt-0.5">
                          {w.grade} — {w.class_name}
                        </p>
                      </div>
                      <div className="text-left shrink-0 mr-3">
                        <p className="text-xs font-bold">{w.label}</p>
                        <p className="text-[10px] opacity-80 mt-0.5">{w.detail}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </HorizonCard>
          </>
        )}
      </motion.div>
    </div>
  );
}
