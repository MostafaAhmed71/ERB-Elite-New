import { useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { StudentCard, type StudentCardProps } from './StudentCard';
import { Button } from '../ui/Button';
import { downloadStudentCardImage } from '../../lib/exportStudentCardsZip';
import { toast } from 'react-hot-toast';

type StudentCardPanelProps = Omit<StudentCardProps, 'wrapperClassName' | 'printSize'> & {
  showPrint?: boolean;
  wrapperClassName?: string;
  studentId?: string;
  qrToken?: string | null;
};

export function StudentCardPanel({
  showPrint = true,
  wrapperClassName,
  studentName,
  grade,
  studentClass,
  admissionNumber,
  photoUrl,
  studentId,
  qrToken,
}: StudentCardPanelProps) {
  const [saving, setSaving] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    if (!studentId) {
      toast.error('تعذّر حفظ البطاقة');
      return;
    }
    setSaving(true);
    try {
      await downloadStudentCardImage({
        id: studentId,
        full_name: studentName,
        grade,
        class_name: studentClass,
        admission_number: admissionNumber,
        qr_token: qrToken,
        photoUrl: photoUrl ?? null,
      });
      toast.success('تم حفظ البطاقة كصورة');
    } catch {
      toast.error('فشل حفظ البطاقة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="student-card-panel flex flex-col items-center gap-4">
      <div id="student-id-card-print" className="flex justify-center print:m-0 print:p-0">
        <StudentCard
          studentName={studentName}
          grade={grade}
          studentClass={studentClass}
          admissionNumber={admissionNumber}
          photoUrl={photoUrl}
          wrapperClassName={wrapperClassName}
          printSize
        />
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {showPrint && (
          <Button type="button" variant="secondary" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
        )}
        {studentId && (
          <Button type="button" variant="secondary" size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            <Download className="h-4 w-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ QR'}
          </Button>
        )}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #student-id-card-print,
          #student-id-card-print * {
            visibility: visible !important;
          }
          #student-id-card-print {
            position: fixed;
            inset: 0;
            display: flex !important;
            align-items: center;
            justify-content: center;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
