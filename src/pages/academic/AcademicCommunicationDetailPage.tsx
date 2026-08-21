import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { academicCommunicationService } from '../../lib/academic/adminService';
import { printHtml } from '../../lib/academic/exportService';
import { PLATFORM_NAME } from '../../lib/branding';
import { AcademicLayout, AcademicPageHeader, academicBtnSecondary } from '../../components/academic/AcademicUi';

export function AcademicCommunicationDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: comm, isLoading } = useQuery({
    queryKey: ['academic-comm', id],
    queryFn: () => academicCommunicationService.getById(id!),
    enabled: !!id,
  });

  const handlePrint = () => {
    if (!comm) return;
    printHtml(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/>
    <style>body{font-family:Cairo,sans-serif;padding:40px} h1{color:#124586} table{width:100%;border-collapse:collapse} td{padding:8px;border-bottom:1px solid #eee}</style></head>
    <body><h1>تقرير التواصل</h1><p>${PLATFORM_NAME}</p>
    <table>
    <tr><td><b>الطالب</b></td><td>${comm.student_name}</td></tr>
    <tr><td><b>المعلم</b></td><td>${comm.teacher_name}</td></tr>
    <tr><td><b>التاريخ</b></td><td>${comm.communication_date}</td></tr>
    <tr><td><b>ملاحظات</b></td><td>${comm.notes ?? '—'}</td></tr>
    <tr><td><b>الحالة</b></td><td>${comm.status}</td></tr>
    </table></body></html>`);
  };

  if (isLoading) return <p className="text-[#A3AED0] p-6">جاري التحميل...</p>;
  if (!comm) return <p className="text-red-400 p-6">غير موجود</p>;

  return (
    <AcademicLayout size="2xl">
      <AcademicPageHeader title={`تواصل: ${comm.student_name}`} backTo="/academic/communication"
        action={<button type="button" className={academicBtnSecondary} onClick={handlePrint}><Printer className="w-4 h-4" /> طباعة</button>}
      />
      <div className="horizon-card rounded-[20px] bg-[#111c44] p-5 text-white space-y-2">
        <p><span className="text-[#A3AED0]">المعلم:</span> {comm.teacher_name}</p>
        <p><span className="text-[#A3AED0]">التاريخ:</span> {comm.communication_date}</p>
        <p><span className="text-[#A3AED0]">الحالة:</span> {comm.status}</p>
        {comm.notes && <p className="text-white/80">{comm.notes}</p>}
      </div>
    </AcademicLayout>
  );
}
