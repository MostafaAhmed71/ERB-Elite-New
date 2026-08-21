import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { academicObservationService } from '../../lib/academic/adminService';
import { printHtml } from '../../lib/academic/exportService';
import { formatGradeLabel, formatGradeSection } from '../../lib/academic/constants';
import { observationEntryToPrintHtml, parseObservationEntry } from '../../lib/academic/observationHelpers';
import { PLATFORM_NAME } from '../../lib/branding';
import { AcademicLayout, AcademicPageHeader, academicBtnSecondary } from '../../components/academic/AcademicUi';
import { ObservationEntriesList } from '../../components/academic/ObservationEntriesList';

export function AcademicReportDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: report, isLoading } = useQuery({
    queryKey: ['academic-obs-report', id],
    queryFn: () => academicObservationService.getReport(id!),
    enabled: !!id,
  });

  const handlePrint = () => {
    if (!report) return;
    const observations = Array.isArray(report.teacher_observations) ? report.teacher_observations : [];
    const obsHtml = observations
      .map(parseObservationEntry)
      .filter(Boolean)
      .map((e) => `<div style="margin-bottom:12px;padding:8px;border:1px solid #eee;border-radius:8px">${observationEntryToPrintHtml(e!)}</div>`)
      .join('') || '—';

    printHtml(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/>
    <style>body{font-family:Cairo,sans-serif;padding:40px} h1{color:#124586} table{width:100%;border-collapse:collapse} td{padding:8px;border-bottom:1px solid #eee}</style></head>
    <body><h1>تقرير ملاحظة الطالب</h1><p>${PLATFORM_NAME}</p>
    <table>
    <tr><td><b>الطالب</b></td><td>${report.student_name}</td></tr>
    <tr><td><b>ولي الأمر</b></td><td>${report.parent_name ?? '—'}</td></tr>
    <tr><td><b>المرحلة</b></td><td>${report.section ? formatGradeSection(report.education_level, report.grade, report.section) : formatGradeLabel(report.education_level, report.grade)}</td></tr>
    <tr><td><b>الحالة</b></td><td>${report.status}</td></tr>
    </table>
    <h2 style="margin-top:24px;color:#124586">تقييمات المعلمين</h2>
    ${obsHtml}
    </body></html>`);
  };

  if (isLoading) return <p className="text-[#A3AED0] p-6">جاري التحميل...</p>;
  if (!report) return <p className="text-red-400 p-6">غير موجود</p>;

  return (
    <AcademicLayout size="2xl">
      <AcademicPageHeader title={`تقرير: ${report.student_name}`} backTo="/academic/reports"
        action={<button type="button" className={academicBtnSecondary} onClick={handlePrint}><Printer className="w-4 h-4" /> طباعة</button>}
      />
      <div className="horizon-card rounded-[20px] bg-[#111c44] p-5 text-white space-y-4">
        <div className="space-y-2 text-sm">
          <p><span className="text-[#A3AED0]">ولي الأمر:</span> {report.parent_name ?? '—'} {report.parent_phone ? `(${report.parent_phone})` : ''}</p>
          <p><span className="text-[#A3AED0]">المرحلة:</span> {report.section ? formatGradeSection(report.education_level, report.grade, report.section) : formatGradeLabel(report.education_level, report.grade)}</p>
          <p><span className="text-[#A3AED0]">الحالة:</span> {report.status === 'completed' ? 'مكتمل' : report.status}</p>
        </div>
        <div>
          <p className="text-[#A3AED0] mb-3 text-sm">تقييمات المعلمين (سلوكي / أكاديمي)</p>
          <ObservationEntriesList raw={report.teacher_observations} />
        </div>
      </div>
    </AcademicLayout>
  );
}
