import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { academicObservationService } from '../../lib/academic/adminService';
import { formatGradeLabel, formatGradeSection } from '../../lib/academic/constants';
import { exportObservationReportPdf } from '../../lib/academic/observationReportExport';
import { showError, showSuccess } from '../../lib/toast';
import { AcademicLayout, AcademicPageHeader, academicBtnSecondary } from '../../components/academic/AcademicUi';
import { ObservationEntriesList } from '../../components/academic/ObservationEntriesList';

export function AcademicReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [exporting, setExporting] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ['academic-obs-report', id],
    queryFn: () => academicObservationService.getReport(id!),
    enabled: !!id,
  });

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportObservationReportPdf(report);
      showSuccess('تم تصدير تقرير الطالب على القالب الرسمي');
    } catch (error) {
      showError(error, 'تعذّر تصدير تقرير الطالب');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) return <p className="text-[#A3AED0] p-6">جاري التحميل...</p>;
  if (!report) return <p className="text-red-400 p-6">غير موجود</p>;

  return (
    <AcademicLayout size="2xl">
      <AcademicPageHeader title={`تقرير: ${report.student_name}`} backTo="/academic/reports"
        action={(
          <button type="button" className={academicBtnSecondary} onClick={() => void handleExport()} disabled={exporting}>
            <Download className="w-4 h-4" />
            {exporting ? 'جاري تجهيز PDF...' : 'تصدير PDF بالقالب الرسمي'}
          </button>
        )}
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
